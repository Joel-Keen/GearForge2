import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SolidMesh } from '../geometry';
import { getSolidBounds } from '../geometry';
import { solidMeshToBufferGeometry } from './solidToBufferGeometry';

export type GearPreviewProps = {
  mesh: SolidMesh;
};

function fitCameraToMesh(camera: THREE.PerspectiveCamera, mesh: SolidMesh): void {
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

  camera.position.set(distance, distance * 0.8, distance);
  camera.lookAt(center);
}

export default function GearPreview({ mesh }: GearPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const geometry = useMemo(() => solidMeshToBufferGeometry(mesh), [mesh]);

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