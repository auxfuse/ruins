varying vec2 vUv;

uniform sampler2D baseTexture;
uniform sampler2D bloomTexture;

void main() {
    gl_FragColor += ( texture2D( baseTexture, vUv ) + vec4( 1.0, 0.0, 0.0, 1.0 ) * texture2D( bloomTexture, vUv ));
}