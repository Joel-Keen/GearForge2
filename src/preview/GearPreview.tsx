import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GearMetrics, GearParams } from '../domain';
import type { GearSolid, Point2D } from '../geometry';
import { buildGearOutline, buildGearPreviewCutoutLoops, buildGearToothOutlines, getInvoluteToothProfile, getSolidBounds } from '../geometry';

export type GearPreviewProps = {
  mesh: GearSolid;
  params: GearParams;
  metrics: GearMetrics;
};

function buildOutlineShape(outline: Point2D[]): THREE.Shape {
  if (outline.length === 0) {
    throw new Error('Preview outline requires at least one point');
  }

  const shape = new THREE.Shape();
  shape.moveTo(outline[0][0], outline[0][1]);
  for (let index = 1; index < outline.length; index += 1) {
    shape.lineTo(outline[index][0], outline[index][1]);
  }
  shape.closePath();
  return shape;
}

function buildPreviewGeometry(params: GearParams, metrics: GearMetrics, mesh: GearSolid): THREE.BufferGeometry {
  const profile = getInvoluteToothProfile(params, metrics);
  const toothOutlines = buildGearToothOutlines(params, profile);
  const outline = buildGearOutline(params, toothOutlines, {}, metrics.root_radius);
  const shape = buildOutlineShape(outline);
  const cutoutLoops = buildGearPreviewCutoutLoops(mesh.cutouts, Math.max(24, Math.round(params.resolution / 2)));

  for (const cutout of cutoutLoops) {
    if (cutout.kind === 'keyway') {
      const [firstPoint, ...restPoints] = cutout.points;
      const hole = new THREE.Path();
      hole.moveTo(firstPoint[0], firstPoint[1]);
      for (const [x, y] of restPoints) {
        hole.lineTo(x, y);
      }
      hole.closePath();
      shape.holes.push(hole);
      continue;
    }

    if (cutout.radius == null) {
      throw new Error('Circular preview cutout requires a radius');
    }

    const hole = new THREE.Path();
    hole.absarc(cutout.center[0], cutout.center[1], cutout.radius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: mesh.thickness,
    bevelEnabled: false,
    curveSegments: Math.max(12, Math.round(params.resolution / 4)),
    steps: 1,
  });
  geometry.translate(0, 0, -mesh.thickness / 2);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function fitCameraToMesh(camera: THREE.PerspectiveCamera, mesh: GearSolid): void {
  const bounds = getSolidBounds(mesh);
  const size = new THREE.Vector3(
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  );
  const center = new THREE.Vector3(
    (bounds.max[0] + bounds.min[0]) / 2,
    (bounds.max[1] + bounds.min[1]) / 2,
    (bounds.max[2] + bounds.min[2]) / 2,
  );
  const maxDimension = Math.max(size.x, size.y, size.z, 1);
  const distance = maxDimension * 1.8;

  camera.position.set(distance * 0.12, distance * 0.08, distance * 2.2);
  camera.lookAt(center);
}

export default function GearPreview({ mesh, params, metrics }: GearPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const geometry = useMemo(() => buildPreviewGeometry(params, metrics, mesh), [mesh, metrics, params]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b0f16');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const ambient = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff1df, 2.2);
    keyLight.position.set(10, 12, 15);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8eb4ff, 1.4);
    fillLight.position.set(-12, -6, 10);
    scene.add(fillLight);

    const meshMaterial = new THREE.MeshStandardMaterial({
      color: '#d8e1ee',
      metalness: 0.18,
      roughness: 0.35,
      flatShading: false,
      side: THREE.DoubleSide,
    });
    const previewMesh = new THREE.Mesh(geometry, meshMaterial);
    scene.add(previewMesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 28),
      new THREE.LineBasicMaterial({ color: '#6d84a6', transparent: true, opacity: 0.35 }),
    );
    scene.add(edges);

    const grid = new THREE.GridHelper(200, 20, 0x243247, 0x1a2230);
    grid.position.z = -(geometry.boundingBox?.max.z ?? 0);
    scene.add(grid);

    fitCameraToMesh(camera, mesh);
    controls.target.set(0, 0, 0);
    controls.update();

    let animationFrame = 0;
    const animate = () => {
      animationFrame = window.requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.cancelAnimationFrame(animationFrame);
      controls.dispose();
      geometry.dispose();
      meshMaterial.dispose();
      (edges.geometry as THREE.BufferGeometry).dispose();
      (edges.material as THREE.Material).dispose();
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [geometry, mesh]);

  return <div ref={containerRef} className="preview-canvas" aria-label="Gear preview viewport" />;
}