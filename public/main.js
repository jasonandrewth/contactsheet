var container;
var camera, scene, renderer, mesh;
var uniforms;
const cursor = document.querySelector("div.cursor")

//=======================================================
//THE ACTUAL SHADERS

const vertexShader = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

		void main() {
			gl_Position = vec4(position, 1.0);
		}

`;

const fragmentShader = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

uniform vec2 u_mouse;
uniform vec2 mouse_norm;
const float PI = 3.141592653589793;


// NOISE 2

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
     return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v)
  {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

// Permutations
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients: 7x7 points over a square, mapped onto an octahedron.
// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}


//



float Distance(vec2 p1, vec2 p2)
{
    return sqrt((p2.x - p1.x)*(p2.x - p1.x) + (p2.y - p1.y)*(p2.y - p1.y))/0.5;
}


void main( )
{
	vec2 uv = gl_FragCoord.xy / u_resolution.xy;
	float time = u_time;

	vec2 mouse_norm = vec2( u_mouse.x/u_resolution.x, 1.0 - u_mouse.y/u_resolution.y );
	vec2 mouse_distance = mouse_norm - (gl_FragCoord.xy / u_resolution);

  float distance = Distance(uv, vec2( u_mouse.x/u_resolution.x, 1.0 - u_mouse.y/u_resolution.y ));
	vec3  raintex = vec3(snoise(vec3(uv.x*8.0,uv.y*2.5+time*1.125,1.0)));

	vec2 where = raintex.xy*uv.xy;

	vec4 gradiant = mix(vec4(1.0,1.0,1.0, 0.0), vec4(raintex, raintex.r), distance);

	vec4 mix1 = mix(vec4(raintex, raintex.b),gradiant*.94,distance);

	gl_FragColor = vec4(raintex,1.0)*vec4(.8,0.8,0.8,distance)+gradiant*-1.0;


}
`;




function init() {
  container = document.getElementById( 'background' );
  camera = camera = new THREE.Camera();
  scene = new THREE.Scene();
  const geometry = new THREE.PlaneBufferGeometry( 2, 2 );

  uniforms = {
    u_time: { type: "f", value: 1.0 },
    u_resolution: { type: "v2", value: new THREE.Vector2() },
    mouse_norm: { type: "v2", value: new THREE.Vector2() },
    u_mouse: { type: "v2", value: new THREE.Vector2() }
  };

  const material = new THREE.ShaderMaterial( {
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader
  } );

  const mesh = new THREE.Mesh( geometry, material );
  scene.add( mesh );

  renderer = new THREE.WebGLRenderer({ alpha: true } );
  renderer.setPixelRatio( window.devicePixelRatio ? window.devicePixelRatio : 1);

  container.appendChild( renderer.domElement );
  renderer.setSize( window.innerWidth * window.devicePixelRatio, window.innerHeight *window.devicePixelRatio );

  onWindowResize();
  window.addEventListener( 'resize', onWindowResize, false );

  document.onmousemove = function(e){
    uniforms.u_mouse.value.y = e.clientY * window.devicePixelRatio * 1.2;
    uniforms.u_mouse.value.x = e.clientX * window.devicePixelRatio * 1.5;
  }

  document.ontouchmove = function(e){
    uniforms.u_mouse.value.y = e.clientY * window.devicePixelRatio * 1.2;
    uniforms.u_mouse.value.x = e.clientX * window.devicePixelRatio * 1.5;
  }
}

function onWindowResize( event ) {
  renderer.setSize( window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio );
  uniforms.u_resolution.value.x = renderer.domElement.width;
  uniforms.u_resolution.value.y = renderer.domElement.height;
  camera.aspect = window.innerWidth * window.devicePixelRatio /  window.innerHeight * window.devicePixelRatio ;
  renderer.setPixelRatio(window.devicePixelRatio);
}

function animate() {
  requestAnimationFrame( animate );
  render();
}

function render() {
  uniforms.u_time.value += 0.006;
  renderer.render( scene, camera );
}


init();
animate();


const changeColor = function (x) {
  // how far on a scale of 0 to 1 are we across the page
  const percentageAcross = x / window.innerWidth
  
  // make a hue from 10 reddish to 130 greenish hue
  const hue = 10 + 120 * percentageAcross
  
  // pick the body tag
  const bodyTag = document.querySelector("body")
  
  // hsl color is hue, saturation and lightness
  // apply a background color to the body
  bodyTag.style.backgroundColor = `hsl(${hue}, 100%, 50%)`  
}

// start at 0 across
changeColor(0)

// on mouse move
document.addEventListener("mousemove", function (event) {
  changeColor(event.pageX)
})

// on touch move
document.addEventListener("touchmove", function (event) {
  changeColor(event.pageX)
})


/*
const moveCursor = function (x, y) {
  cursor.style.left = x + "px"
  cursor.style.top = y + "px"
}

document.addEventListener("mousemove", function (event) {
  // event.pageX -> where we are on the page across
  // event.pageY -> where we are on the page downwards
  moveCursor(event.pageX, event.pageY)
})*/