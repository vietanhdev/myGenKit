/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// tslint:disable:organize-imports
// tslint:disable:ban-malformed-import-paths
// tslint:disable:no-new-decorators

import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {Analyser} from './analyser';

import * as THREE from 'three';
import {EXRLoader} from 'three/examples/jsm/loaders/EXRLoader.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {FXAAShader} from 'three/examples/jsm/shaders/FXAAShader.js';
import {fs as backdropFS, vs as backdropVS} from './backdrop-shader';
import {vs as sphereVS} from './sphere-shader';

/**
 * 3D live audio visual.
 */
@customElement('gdm-live-audio-visuals-3d')
export class GdmLiveAudioVisuals3D extends LitElement {
  private inputAnalyser!: Analyser | null;
  private outputAnalyser!: Analyser | null;
  private camera!: THREE.PerspectiveCamera;
  private backdrop!: THREE.Mesh;
  private composer!: EffectComposer;
  private sphere!: THREE.Mesh;
  private prevTime = 0;
  private rotation = new THREE.Vector3(0, 0, 0);
  private lastConnectionCheck = 0;

  private _outputNode!: AudioNode;

  @property()
  set outputNode(node: AudioNode) {
    this._outputNode = node;
    if (this.outputAnalyser) {
      // Disconnect old analyzer
      this.outputAnalyser = null;
    }
    this.outputAnalyser = new Analyser(this._outputNode);
  }

  get outputNode() {
    return this._outputNode;
  }

  private _inputNode!: AudioNode;

  @property()
  set inputNode(node: AudioNode) {
    this._inputNode = node;
    if (this.inputAnalyser) {
      // Disconnect old analyzer
      this.inputAnalyser = null;
    }
    this.inputAnalyser = new Analyser(this._inputNode);
  }

  get inputNode() {
    return this._inputNode;
  }

  private checkAnalyzersConnection() {
    // Check if analyzers are still working by testing if they can get data
    if (this.inputAnalyser) {
      try {
        this.inputAnalyser.update();
        // If data is all zeros, the analyzer might be disconnected
        const data = this.inputAnalyser.data;
        const hasData = Array.from(data).some(val => val > 0);
        if (!hasData && this._inputNode) {
          // Try to recreate the analyzer
          this.inputAnalyser = new Analyser(this._inputNode);
        }
      } catch (error) {
        console.warn('Input analyzer disconnected, recreating...', error);
        if (this._inputNode) {
          this.inputAnalyser = new Analyser(this._inputNode);
        }
      }
    }
    
    if (this.outputAnalyser) {
      try {
        this.outputAnalyser.update();
        // If data is all zeros, the analyzer might be disconnected
        const data = this.outputAnalyser.data;
        const hasData = Array.from(data).some(val => val > 0);
        if (!hasData && this._outputNode) {
          // Try to recreate the analyzer
          this.outputAnalyser = new Analyser(this._outputNode);
        }
      } catch (error) {
        console.warn('Output analyzer disconnected, recreating...', error);
        if (this._outputNode) {
          this.outputAnalyser = new Analyser(this._outputNode);
        }
      }
    }
  }

  private canvas!: HTMLCanvasElement;

  static styles = css`
    canvas {
      width: 100% !important;
      height: 100% !important;
      position: absolute;
      inset: 0;
      image-rendering: pixelated;
      object-fit: contain; /* Ensure the canvas maintains aspect ratio */
    }
  `;

  connectedCallback() {
    super.connectedCallback();
  }

  private generateMockAudioData(): number[] {
    const time = performance.now() * 0.001;
    return [
      Math.sin(time * 0.5) * 60 + 80,  // Base level around 80 with variation
      Math.sin(time * 0.3) * 40 + 60,  // Mid frequencies
      Math.sin(time * 0.7) * 30 + 50,  // High frequencies
      Math.sin(time * 0.2) * 20 + 40   // Additional data
    ];
  }

  private init() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x100c14);

    const backdrop = new THREE.Mesh(
      new THREE.IcosahedronGeometry(10, 5),
      new THREE.RawShaderMaterial({
        uniforms: {
          resolution: {value: new THREE.Vector2(1, 1)},
          rand: {value: 0},
        },
        vertexShader: backdropVS,
        fragmentShader: backdropFS,
        glslVersion: THREE.GLSL3,
      }),
    );
    backdrop.material.side = THREE.BackSide;
    scene.add(backdrop);
    this.backdrop = backdrop;

    const camera = new THREE.PerspectiveCamera(
      75,
      1.0, // Force 1:1 aspect ratio for perfect sphere
      0.1,
      1000,
    );
    camera.position.set(2, -2, 5);
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !true,
    });
    // Use square dimensions for perfect sphere aspect ratio
    const containerWidth = this.clientWidth || window.innerWidth;
    const containerHeight = this.clientHeight || window.innerHeight;
    const size = Math.min(containerWidth, containerHeight);
    
    renderer.setSize(size, size);
    renderer.setPixelRatio(window.devicePixelRatio / 1);

    const geometry = new THREE.IcosahedronGeometry(1, 10);

    new EXRLoader().load('piz_compressed.exr', (texture: THREE.Texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      const exrCubeRenderTarget = pmremGenerator.fromEquirectangular(texture);
      sphereMaterial.envMap = exrCubeRenderTarget.texture;
      sphere.visible = true;
    });

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0x000010,
      metalness: 0.5,
      roughness: 0.1,
      emissive: 0x000010,
      emissiveIntensity: 1.5,
    });

    sphereMaterial.onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.uniforms.time = {value: 0};
      shader.uniforms.inputData = {value: new THREE.Vector4()};
      shader.uniforms.outputData = {value: new THREE.Vector4()};

      sphereMaterial.userData.shader = shader;

      shader.vertexShader = sphereVS;
    };

    const sphere = new THREE.Mesh(geometry, sphereMaterial);
    scene.add(sphere);
    sphere.visible = false;

    this.sphere = sphere;

    const renderPass = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size, size),
      5,
      0.5,
      0,
    );

    const fxaaPass = new ShaderPass(FXAAShader);

    const composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    // composer.addPass(fxaaPass);
    composer.addPass(bloomPass);

    this.composer = composer;
    
    // Set initial composer size to square
    composer.setSize(size, size);

    const onWindowResize = () => {
      // Use container dimensions instead of full window
      const containerWidth = this.clientWidth || window.innerWidth;
      const containerHeight = this.clientHeight || window.innerHeight;
      
      // Force 1:1 aspect ratio for perfect sphere
      camera.aspect = 1.0;
      camera.updateProjectionMatrix();
      
      // Use square dimensions for rendering
      const size = Math.min(containerWidth, containerHeight);
      const dPR = renderer.getPixelRatio();
      
      backdrop.material.uniforms.resolution.value.set(size * dPR, size * dPR);
      renderer.setSize(size, size);
      composer.setSize(size, size);
      fxaaPass.material.uniforms['resolution'].value.set(
        1 / (size * dPR),
        1 / (size * dPR),
      );
    };

    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    this.animation();
  }

  private animation() {
    requestAnimationFrame(() => this.animation());

    // Periodically check if analyzers are still connected (every 2 seconds)
    const currentTime = performance.now();
    if (!this.lastConnectionCheck || currentTime - this.lastConnectionCheck > 2000) {
      this.checkAnalyzersConnection();
      this.lastConnectionCheck = currentTime;
    }

    // Only update analyzers if they exist
    if (this.inputAnalyser) {
      this.inputAnalyser.update();
    }
    if (this.outputAnalyser) {
      this.outputAnalyser.update();
    }

    const t = performance.now();
    const dt = (t - this.prevTime) / (1000 / 60);
    this.prevTime = t;
    const backdropMaterial = this.backdrop.material as THREE.RawShaderMaterial;
    const sphereMaterial = this.sphere.material as THREE.MeshStandardMaterial;

    backdropMaterial.uniforms.rand.value = Math.random() * 10000;

    if (sphereMaterial.userData.shader) {
      // Use default values if analyzers don't exist yet, or generate mock data
      const outputData = this.outputAnalyser?.data || this.generateMockAudioData();
      const inputData = this.inputAnalyser?.data || this.generateMockAudioData();

      this.sphere.scale.setScalar(
        1 + (0.2 * outputData[1]) / 255,
      );

      const f = 0.001;
      this.rotation.x += (dt * f * 0.5 * outputData[1]) / 255;
      this.rotation.z += (dt * f * 0.5 * inputData[1]) / 255;
      this.rotation.y += (dt * f * 0.25 * inputData[2]) / 255;
      this.rotation.y += (dt * f * 0.25 * outputData[2]) / 255;

      const euler = new THREE.Euler(
        this.rotation.x,
        this.rotation.y,
        this.rotation.z,
      );
      const quaternion = new THREE.Quaternion().setFromEuler(euler);
      const vector = new THREE.Vector3(0, 0, 5);
      vector.applyQuaternion(quaternion);
      this.camera.position.copy(vector);
      this.camera.lookAt(this.sphere.position);

      sphereMaterial.userData.shader.uniforms.time.value +=
        (dt * 0.1 * outputData[0]) / 255;
      sphereMaterial.userData.shader.uniforms.inputData.value.set(
        (1 * inputData[0]) / 255,
        (0.1 * inputData[1]) / 255,
        (10 * inputData[2]) / 255,
        0,
      );
      sphereMaterial.userData.shader.uniforms.outputData.value.set(
        (2 * outputData[0]) / 255,
        (0.1 * outputData[1]) / 255,
        (10 * outputData[2]) / 255,
        0,
      );
    }

    this.composer.render();
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
    'gdm-live-audio-visuals-3d': GdmLiveAudioVisuals3D;
  }
  interface HTMLElement {
    inputNode?: AudioNode;
    outputNode?: AudioNode;
  }
}
