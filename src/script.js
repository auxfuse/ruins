import GUI from 'lil-gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import glyphVertexShader from './shaders/glyph/vertex.glsl';
import glyphFragmentShader from './shaders/glyph/fragment.glsl';

/**
 * Base
 */
// Debug
// const gui = new GUI({
//     width: 400
// })

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader()

// Draco loader
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('draco/')

// GLTF loader
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

/**
 * Model
 */

const ruins = gltfLoader.load('ruins_noLights.glb', (gltf) => {
    console.log(gltf.scene);
    gltf.scene.traverse((child) => {
        if(child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            if(child.name !== 'glyph' || child.name !== 'glyph001') {
                child.layers.set(2);
            };

            if(child.name === 'glyph' || child.name === 'glyph001' ) {
                child.layers.set(1);
            };
        }
    });

    gltf.scene.scale.set(0.5, 0.5, 0.5);
    
    scene.add(gltf.scene);
});

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
});

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0x2900AC, 10);
ambientLight.layers.set(2);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(
    0xfefefe, 0x080800, 1
);
hemisphereLight.layers.set(2);
scene.add(hemisphereLight);

const pointLight = new THREE.PointLight(
    0xff0000, 100, 100
);
pointLight.position.set(0, 5, 0);
pointLight.castShadow = true;
pointLight.shadow.camera.near = 2;
pointLight.shadow.camera.far = 6;
pointLight.shadow.normalBias = 0.05;
pointLight.shadow.bias = - 0.004;
pointLight.layers.set(2);
scene.add(pointLight);

const directionalLight = new THREE.DirectionalLight(
    0xffffff, 1
);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(512, 512);
directionalLight.shadow.camera.near = 4;
directionalLight.shadow.camera.far = 10;
directionalLight.shadow.normalBias = 0.05;
directionalLight.shadow.bias = - 0.004;
directionalLight.position.set(-5, 2, -5);
directionalLight.target.updateWorldMatrix();
directionalLight.layers.set(2);
scene.add(directionalLight);

const axisHelper = new THREE.AxesHelper();
axisHelper.position.set(0, 2, 0);
scene.add(axisHelper);

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 4
camera.position.y = 2
camera.position.z = 4
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
})
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Effect Composer
 */

const renderScene = new RenderPass( scene, camera );

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(
        sizes.width, sizes.height
    ), 0.2, 2, 0.001
);
const bloomComposer = new EffectComposer( renderer );
bloomComposer.renderToScreen = false;
bloomComposer.addPass( renderScene );
bloomComposer.addPass( bloomPass );

const mixPass = new ShaderPass(
    new THREE.ShaderMaterial({
        uniforms: {
            baseTexture: { value: null },
            bloomTexture: { value: bloomComposer.renderTarget2.texture }
        },
        vertexShader: glyphVertexShader,
        fragmentShader: glyphFragmentShader,
        defines: {}
    }), 'baseTexture'
);
mixPass.needsSwap = true;

const outputPass = new OutputPass();

const finalComposer = new EffectComposer( renderer );
finalComposer.addPass( renderScene );
finalComposer.addPass( mixPass );
finalComposer.addPass( outputPass );

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime();

    // Update controls
    controls.update()

    // Render
    renderer.clear();
    renderer.clearDepth();

    camera.layers.set(1);
    bloomComposer.render();

    camera.layers.set(2);
    finalComposer.render();

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()