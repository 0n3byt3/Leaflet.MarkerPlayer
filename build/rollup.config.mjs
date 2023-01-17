import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const version = pkg.version;
const banner = createBanner(version);

function createBanner(version) {
	return `/* @preserve
* Leaflet.MarkerPlayer ${version}, a Leaflet plug-in for animating marker with ability to get/set progress.
* https://github.com/0n3byt3/Leaflet.MarkerPlayer
* (c) ${new Date().getFullYear()} 0n3byt3
*/`;
}

export default {
	input: 'src/index.js',
	output: [
		{
			name: 'L',
			file: pkg.main,
			format: 'umd',
			extend: true,
			sourcemap: true,
			freeze: false,
			esModule: false,
			banner: banner,
			globals: {
		      'leaflet/dist/leaflet-src.esm.js': 'L'
			},
			paths: {
				'leaflet/dist/leaflet-src.esm.js': 'leaflet'
			}
		},
		{
			file: pkg.module,
			format: 'es',
			sourcemap: true,
			banner: banner,
			freeze: false
		}
	],
	plugins: [],
	external: [...Object.keys(pkg.peerDependencies), 'leaflet/dist/leaflet-src.esm.js']
};
