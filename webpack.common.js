const path = require('path');
const webpack = require('webpack');

module.exports = {
	entry: {
	  index: './src/index.js',
	},
	output: {
		filename: 'leaflet.markerplayer.min.js',
		path: path.resolve(__dirname, 'dist/'),
	},
	module: {
		rules: [
			{
				test: /\.(jsx|js)$/,
				exclude: /node_modules/,
				use: {
			        loader: 'babel-loader',
			        options: {
			          presets: [
			            ['@babel/preset-env', { targets: "defaults" }]
			          ]
			        }
		      	}
			}
		]
	},
	plugins: [
	],
};
