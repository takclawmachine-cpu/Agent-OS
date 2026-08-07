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
    core.position.set(1.8, -0.7, -3);
    field.add(core);

    const rings = [2.8, 3.5, 4.3].map((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.012, 6, 100),
        new THREE.MeshBasicMaterial({ color: index === 1 ? 0xffffff : 0xff3657, transparent: true, opacity: 0.1 }),
      );
      ring.position.copy(core.position);
      ring.rotation.set(index * 0.65, index * 0.4, index * 0.9);
      field.add(ring);
      return ring;
    });

    let frame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: 0, y: 0 };

    const render = () => {
      field.rotation.y += reducedMotion ? 0 : 0.0007;
      field.rotation.x += reducedMotion ? 0 : 0.00015;
      core.rotation.y += reducedMotion ? 0 : 0.0028;
      rings.forEach((ring, index) => {
        ring.rotation.z += reducedMotion ? 0 : 0.0008 * (index + 1);
      });
      camera.position.x += (pointer.x - camera.position.x) * 0.018;
      camera.position.y += (-pointer.y - camera.position.y) * 0.018;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      if (!reducedMotion) frame = window.requestAnimationFrame(render);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 0.7;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 0.45;
    };
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("resize", onResize);
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
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
