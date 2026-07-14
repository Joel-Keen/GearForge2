import * as THREE from 'three';
import type { SolidMesh } from '../geometry';

export function solidMeshToBufferGeometry(mesh: SolidMesh): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];

  for (const triangle of mesh.triangles) {
    for (const vertexIndex of triangle) {
      const [x, y, z] = mesh.vertices[vertexIndex];
      positions.push(x, y, z);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}