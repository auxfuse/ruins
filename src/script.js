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
const gui = new GUI({
    width: 400
})

// bloom layer
const BLOOM_SCENE = 1;

const bloomLayer = new THREE.Layers();
bloomLayer.set( BLOOM_SCENE );

const darkMaterial = new THREE.MeshBasicMaterial({
    color: 'black'
});
const materials = {};
// const materials = [];

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

gltfLoader.load('ruins_noLights.glb', (gltf) => {
    console.log(gltf.scene);
    gltf.scene.traverse((child) => {
        if(child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            if(child.name !== 'glyph' || child.name !== 'glyph001') {
                darkenNonBloom(child.material.uuid);
            }
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
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(
    0xfefefe, 0x080800, 1
);
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
scene.add(directionalLight);

const axisHelper = new THREE.AxesHelper();
axisHelper.position.set(0, 2, 0);
// scene.add(axisHelper);

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 4
camera.position.y = 2
camera.position.z = 4
scene.add(camera)

// Helpers
// const directionalLightCameraHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
// const pointLightCameraHelper = new THREE.CameraHelper(pointLight.shadow.camera);
// scene.add(directionalLightCameraHelper, pointLightCameraHelper);

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
renderer.toneMapping - THREE.ReinhardToneMapping;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Effect Composer
 */

const renderScene = new RenderPass( scene, camera );

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(
        sizes.width, sizes.height
    ), 5, 5, 0.5
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

function darkenNonBloom( obj ) {
    if ( obj.isMesh && bloomLayer.test( obj.layers ) === false ) {
        materials[ obj.uuid ] = obj.material;
        obj.material = darkMaterial;
    }
};

function restoreMaterial( obj ) {
    if ( materials[ obj.uuid ] ) {
        obj.material = materials[ obj.uuid ];
        delete materials[ obj.uuid ];
    }
};

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime();

    // glyphLightMaterial.uniforms.uTime.value = elapsedTime;

    // Update controls
    controls.update()

    // Render
    scene.traverse( darkenNonBloom );
    // renderer.render(scene, camera);
    bloomComposer.render();
    // composer.render();
    scene.traverse( restoreMaterial );
    finalComposer.render();
    

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()