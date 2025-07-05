/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {Analyser} from './analyser';
import * as THREE from 'three';

/**
 * Lightweight 3D audio visual for background use.
 */
@customElement('gdm-live-audio-visuals-3d-lightweight')
export class GdmLiveAudioVisuals3DLightweight extends LitElement {
  private inputAnalyser!: Analyser;
  private outputAnalyser!: Analyser;
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private spheres: THREE.Mesh[] = [];
  private prevTime = 0;
  private frameCount = 0;
  private animationId: number | null = null;

  private _outputNode!: AudioNode;

  @property()
  set outputNode(node: AudioNode) {
    this._outputNode = node;
    this.outputAnalyser = new Analyser(this._outputNode);
  }

  get outputNode() {
    return this._outputNode;
  }

  private _inputNode!: AudioNode;

  @property()
  set inputNode(node: AudioNode) {
    this._inputNode = node;
    this.inputAnalyser = new Analyser(this._inputNode);
  }

  get inputNode() {
    return this._inputNode;
  }

  private canvas!: HTMLCanvasElement;

  static styles = css`
    canvas {
      width: 100% !important;
      height: 100% !important;
      position: absolute;
      inset: 0;
      image-rendering: pixelated;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

    // Simple camera setup
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    this.camera.position.set(0, 0, 15);

    // Lightweight renderer settings
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    });
    
    // Reduce resolution for better performance
    const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(window.innerWidth * 0.5, window.innerHeight * 0.5);
    this.canvas.style.imageRendering = 'pixelated';

    // Create simple geometric spheres
    this.createSpheres();

    // Add resize listener
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.onWindowResize();

    this.animation();
  }

  private createSpheres() {
    const geometry = new THREE.SphereGeometry(0.5, 8, 6); // Low-poly sphere
    
    // Create a few spheres with simple materials
    for (let i = 0; i < 5; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(i * 0.2, 0.8, 0.5),
        transparent: true,
        opacity: 0.6,
      });
      
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );
      
      this.scene.add(sphere);
      this.spheres.push(sphere);
    }
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    
    // Keep reduced resolution
    const w = window.innerWidth * 0.5;
    const h = window.innerHeight * 0.5;
    this.renderer.setSize(w, h);
  }

  private animation() {
    // Limit frame rate to 30fps for better performance
    this.animationId = requestAnimationFrame(() => this.animation());
    
    this.frameCount++;
    if (this.frameCount % 2 !== 0) return; // Skip every other frame

    if (!this.inputAnalyser || !this.outputAnalyser) return;

    this.inputAnalyser.update();
    this.outputAnalyser.update();

    const t = performance.now();
    const dt = (t - this.prevTime) / (1000 / 30); // 30fps timing
    this.prevTime = t;

    // Simple audio-reactive animation
    const audioLevel = (this.outputAnalyser.data[0] + this.inputAnalyser.data[0]) / 510;
    const audioMid = (this.outputAnalyser.data[1] + this.inputAnalyser.data[1]) / 510;
    
    // Animate spheres
    this.spheres.forEach((sphere, index) => {
      const phase = (index * Math.PI * 2) / this.spheres.length;
      const time = t * 0.001;
      
      // Gentle floating motion
      sphere.position.y = Math.sin(time + phase) * 2 + Math.sin(time * 0.5 + phase) * 1;
      sphere.position.x = Math.cos(time * 0.7 + phase) * 3;
      sphere.position.z = Math.sin(time * 0.3 + phase) * 2;
      
      // Scale based on audio
      const scale = 1 + audioLevel * 0.5;
      sphere.scale.setScalar(scale);
      
      // Rotate based on audio
      sphere.rotation.x += dt * 0.01 * (1 + audioMid);
      sphere.rotation.y += dt * 0.005 * (1 + audioLevel);
      
      // Adjust opacity based on audio
      const material = sphere.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 + audioLevel * 0.4;
    });

    // Gently rotate camera
    this.camera.position.x = Math.cos(t * 0.0001) * 15;
    this.camera.position.z = Math.sin(t * 0.0001) * 15;
    this.camera.lookAt(0, 0, 0);

    // Simple render without post-processing
    this.renderer.render(this.scene, this.camera);
  }

  protected firstUpdated() {
    this.canvas = this.shadowRoot!.querySelector('canvas') as HTMLCanvasElement;
    this.init();
  }

  protected render() {
    return html`<canvas></canvas>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gdm-live-audio-visuals-3d-lightweight': GdmLiveAudioVisuals3DLightweight;
  }
  interface HTMLElement {
    inputNode?: AudioNode;
    outputNode?: AudioNode;
  }
} 