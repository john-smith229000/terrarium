import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Renders the scene to a low-res target, then upscales with nearest-neighbor
// giving that chunky PS1 pixel look
export function PS1Effect({ resolution = 0.15 }) {
  const { gl, scene, camera, size } = useThree();

  const rtRef = useRef();
  const quadRef = useRef();
  const quadSceneRef = useRef(new THREE.Scene());
  const quadCamRef = useRef(new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
  const matRef = useRef();

  useEffect(() => {
    const w = Math.floor(size.width  * resolution);
    const h = Math.floor(size.height * resolution);

    const rt = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      generateMipmaps: false,
    });
    rtRef.current = rt;

    const mat = new THREE.MeshBasicMaterial({ map: rt.texture });
    matRef.current = mat;

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quadRef.current = quad;
    quadSceneRef.current.add(quad);

    return () => {
      rt.dispose();
      mat.dispose();
      quadSceneRef.current.remove(quad);
    };
  }, [size, resolution]);

  useFrame(() => {
    if (!rtRef.current) return;
    // 1. render main scene into low-res target
    gl.setRenderTarget(rtRef.current);
    gl.render(scene, camera);
    // 2. blit low-res target to screen with nearest-filter (pixelated)
    gl.setRenderTarget(null);
    gl.render(quadSceneRef.current, quadCamRef.current);
  }, 1); // priority 1 — runs after default render

  return null;
}