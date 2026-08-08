"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function NeuralField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050001, 0.045);
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 12;

    const field = new THREE.Group();
    scene.add(field);

    const globe = new THREE.Group();
    scene.add(globe);

    const particleCount = 680;
    const positions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const radius = 4 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[index * 3 + 2] = radius * Math.cos(phi);
    }

    const particles = new THREE.BufferGeometry();
    particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({ color: 0xff3657, size: 0.035, transparent: true, opacity: 0.56 });
    field.add(new THREE.Points(particles, particleMaterial));

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.3, 2),
      new THREE.MeshBasicMaterial({ color: 0xff3657, wireframe: true, transparent: true, opacity: 0.11 }),
    );
    globe.add(core);

    const rings = [2.8, 3.5, 4.3].map((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.012, 6, 100),
        new THREE.MeshBasicMaterial({ color: index === 1 ? 0xffffff : 0xff3657, transparent: true, opacity: 0.1 }),
      );
      ring.rotation.set(index * 0.65, index * 0.4, index * 0.9);
      globe.add(ring);
      return ring;
    });

    let frame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const globeDepth = -3;

    const anchorGlobe = () => {
      const microphone = document.querySelector<HTMLElement>(".voice-core");
      const centerX = microphone ? microphone.getBoundingClientRect().left + microphone.offsetWidth / 2 : window.innerWidth / 2;
      const centerY = microphone ? microphone.getBoundingClientRect().top + microphone.offsetHeight / 2 : window.innerHeight / 2;
      const projected = new THREE.Vector3(
        centerX / window.innerWidth * 2 - 1,
        -(centerY / window.innerHeight) * 2 + 1,
        0.5,
      ).unproject(camera);
      const direction = projected.sub(camera.position).normalize();
      const distance = (globeDepth - camera.position.z) / direction.z;
      globe.position.copy(camera.position).add(direction.multiplyScalar(distance));
    };

    const render = () => {
      field.rotation.y += reducedMotion ? 0 : 0.0007;
      field.rotation.x += reducedMotion ? 0 : 0.00015;
      core.rotation.y += reducedMotion ? 0 : 0.0028;
      rings.forEach((ring, index) => {
        ring.rotation.z += reducedMotion ? 0 : 0.0008 * (index + 1);
      });
      anchorGlobe();
      renderer.render(scene, camera);
      if (!reducedMotion) frame = window.requestAnimationFrame(render);
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      anchorGlobe();
    };

    window.addEventListener("resize", onResize);
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      particles.dispose();
      particleMaterial.dispose();
      core.geometry.dispose();
      (core.material as THREE.Material).dispose();
      rings.forEach((ring) => {
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
      });
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="neural-field" aria-hidden="true" />;
}
