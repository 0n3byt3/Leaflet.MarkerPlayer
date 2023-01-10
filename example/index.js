const map = L.map('map').setView([51.505, -0.09], 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// create a red polyline from an array of LatLng points
const latlngs = [
    [45.51, -120.68],
    [37.77, -100.43],
    [34.04, -80.2],
	[37.04, -79.2]
];

const polyline = L.polyline(latlngs, {color: '#5197e8'}).addTo(map);

// zoom the map to the polyline
map.fitBounds(polyline.getBounds());
map.setZoom(5);

//create markerplayer
const points = latlngs.map((v, i) => {
	return {id: i, latlng: v};
});
const animMarker = L.markerPlayer(points, 10000).addTo(map);

//init contorols
const playTogBtn = document.getElementById('play-tog-btn');
const progBar = document.getElementById('prog-bar');
function startAnim() {
	animMarker.start();
	playTogBtn.innerText = "⏸";
}
function pauseAnim() {
	animMarker.pause();
	playTogBtn.innerText = "▶";
}
playTogBtn.addEventListener('click', e => {
	if(animMarker.isRunning()) {
		pauseAnim();
	} else {
		startAnim();
	}
});
animMarker.on('end', e => {
	playTogBtn.innerText = "▶";
});
animMarker.on('progresschange', e => {
	progBar.setAttribute('style', `width: ${e.progress}%`);
});
animMarker.on('pointchange', e => {
	document.getElementById('point-id').innerText = e.point.id;
});
