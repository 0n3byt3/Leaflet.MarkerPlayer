// (function (factory, window) {
//
//     // define an AMD module that relies on 'leaflet'
//     if (typeof define === 'function' && define.amd) {
//         define(['leaflet'], factory);
//
//     // define a Common JS module that relies on 'leaflet'
//     } else if (typeof exports === 'object') {
//         module.exports = factory(require('leaflet'));
//     }
//
//     // attach your plugin to the global 'L' variable
//     if (typeof window !== 'undefined' && window.L) {
//         window.L.MarkerPlayer = factory(L);
//     }
// }(function (L) {
//
//
//     return MarkerPlayer;
// }, window));

const MarkerPlayer = L.MarkerPlayer = L.Marker.extend({
	//state constants
	statics: {
		notStartedState: 0,
		endedState: 1,
		pausedState: 2,
		runState: 3
	},

	options: {
		autostart: false,
		loop: false,
	},

	initialize(points, duration, options) {
		L.Marker.prototype.initialize.call(this, points[0].latlng, options);
		this._points = points;

		if (duration instanceof Array) {
			this._totDuration = duration.reduce((acc, curr) => acc + curr);
			this._durations = duration;
			let sum = 0;
			this._accDurations = duration.map(v => { return sum += v});
		} else {
			this._totDuration = duration;
			[this._durations, this._accDurations] = this._createDurations(this._points, duration);
		}

		this._currentDuration = 0;
		this._currentIndex = 0;

		this._state = L.MarkerPlayer.notStartedState;
		this._startTime = 0;
		this._startTimeStamp = 0;  // timestamp given by requestAnimFrame
		this._pauseStartTime = 0;
		this._animId = 0;
		this._animRequested = false;
		this._currentLine = [];
		this._stations = {};
		this._progChanged = false;
	},

	isRunning() {
		return this._state === L.MarkerPlayer.runState;
	},

	isEnded() {
		return this._state === L.MarkerPlayer.endedState;
	},

	isStarted() {
		return this._state !== L.MarkerPlayer.notStartedState;
	},

	isPaused() {
		return this._state === L.MarkerPlayer.pausedState;
	},

	start() {
		if (this.isRunning()) {
			return;
		}
		if (this.isPaused()) {
			this.resume();
		} else {
			if(!this._progChanged)
				this._loadLine(0);
			this._startAnimation();
			this.fire('start');
		}
	},

	pause() {
		if (!this.isRunning()) {
			return;
		}
		this._pauseStartTime = Date.now();
		this._state = L.MarkerPlayer.pausedState;
		this._stopAnimation();
	},

	resume() {
		if (!this.isPaused()) {
			return;
		}
		if(!this._progChanged) {
			// update the current line
			this._currentLine[0] = {...this._points[this._currentIndex], latlng: this.getLatLng()};
			this._currentDuration -= (this._pauseStartTime - this._startTime);
		}
		this._startAnimation();
	},

	stop(elapsedTime) { //todo: some work on usercall(first if)
		if (this.isEnded()) {
			if(typeof(elapsedTime) === 'undefined')
				this.setLatLng(this._points[0].latlng);
			return;
		}
		this._stopAnimation();
		if (typeof(elapsedTime) === 'undefined') {
			// user call
			elapsedTime = 0;
			//this._updatePosition();
			this.setLatLng(this._points[0].latlng);
		}
		this._state = L.MarkerPlayer.endedState;
		this._progChanged = false; //important so it wont make double end
		this.fire('end', {progress: this.getProgress()});
	},

	addPoint(point, duration) {
		//this._points.push(L.latLng(latlng));
		this._points.push(point);
		this._durations.push(duration);
	},

	moveTo(point, duration) {
		this._stopAnimation();
		this._points = [{...this._points[this._currentIndex], latlng: this.getLatLng()}, point];
		this._durations = [duration];
		this._state = L.MarkerPlayer.notStartedState;
		this.start();
		this.options.loop = false;
	},

	addStation(pointIndex, duration) {
		if (pointIndex > this._points.length - 2 || pointIndex < 1) {
			return;
		}
		this._stations[pointIndex] = duration;
	},

	onAdd(map) {
		L.Marker.prototype.onAdd.call(this, map);

		if (this.options.autostart && (! this.isStarted())) {
			this.start();
			return;
		}

		if (this.isRunning()) {
			this._resumeAnimation();
		}
	},

	onRemove(map) {
		L.Marker.prototype.onRemove.call(this, map);
		this._stopAnimation();
	},

	//return anim progress by percentage or by time format
	getProgress(timeFormat = false) {
		let indx = this._currentIndex;
		let acc = indx? this._accDurations[indx - 1] : 0;
		let elapsed = acc;
		if(this._durations[indx]) { //in case the p1 = p2 : this._durations[indx] = 0
			let p1 = this._points[indx].latlng;
			let p2 = this._points[indx + 1].latlng;
			let ratio = this.getLatLng().distanceTo(p1) / L.latLng(p1).distanceTo(p2);
			elapsed = acc + ratio * this._durations[indx];
		}
		if(timeFormat)
			return Math.round(elapsed * 100) /100;
		let percnt = elapsed / this._totDuration * 100;
		return Math.round(percnt * 100) /100;
	},

	//set anim progress by percentage
	setProgress(percentage) {
		this._progChanged = true;
		let isRunning = false;
		if (this.isRunning()) {
			this.pause(); //must be updated to make it still Running on progchange event; should use _progChanged.
			isRunning = true;
		} else if(this.isEnded()) { //make setProg possible after end
			this._state = L.MarkerPlayer.notStartedState;
		}
		let p = percentage;
		p = (p > 100)? 100 : p;
		p = (p < 0)? 0 : p;
		const t = this._totDuration * p / 100;
		const dur = this._durations;
		const accDur = this._accDurations;
		let indx;
		for(let i = 0, len = accDur.length; i < len; i++) {
			if(accDur[i] >= t) {
				indx = i;
				break;
			}
		}
		const elapsedTime = t - accDur[indx - 1];
		this._loadLine(indx);
		this._animate(this._startTimeStamp + elapsedTime, true);
		if (isRunning)
			this.resume();
	},

	//set new dur for anim
	setDuration(newDuration) {
		let isRunning = false;
		if (this.isRunning()) {
			this.pause();
			isRunning = true;
		}
		let duration = newDuration;
		if (duration instanceof Array) {
			this._totDuration = duration.reduce((acc, curr) => acc + curr);
			this._durations = duration;
			let sum = 0;
			this._accDurations = duration.map(v => { return sum += v});
		} else {
			this._totDuration = duration;
			[this._durations, this._accDurations] = this._createDurations(this._points, duration);
		}
		if (isRunning)
			this.resume();
	},

	_createDurations(points, duration) {
		let lastIndex = points.length - 1;
		let distances = [];
		let totalDistance = 0;
		let distance = 0;

		// compute array of distances between points
		for (let i = 0; i < lastIndex; i++) {
			distance = L.latLng(points[i + 1].latlng).distanceTo(points[i].latlng);
			distances.push(distance);
			totalDistance += distance;
		}

		let ratioDuration = duration / totalDistance;

		let durations = [];
		let accDurations = []; //accumulative durations
		for (let i = 0; i < distances.length; i++) {
			durations.push(distances[i] * ratioDuration);
			if( i === 0)
				accDurations.push(durations[i]);
			else if( i === distances.length - 1)
				accDurations.push(duration);
			else
				accDurations.push(accDurations[i-1] + durations[i]);
		}

		return [durations, accDurations];
	},

	_interpolatePosition(p1, p2, duration, t) {
		let r = t/duration;
		r = (r > 0) ? r : 0;
		r = (r > 1) ? 1 : r;

		return L.latLng(
			p1.lat + r * (p2.lat - p1.lat),
			p1.lng + r * (p2.lng - p1.lng)
		);
	},

	_startAnimation() {
		this._state = L.MarkerPlayer.runState;
		this._progChanged = false; //imoortant so it run by default
		this._animId = L.Util.requestAnimFrame(function(timestamp) {
			this._startTime = Date.now();
			this._startTimeStamp = timestamp;
			this._animate(timestamp);
		}, this, true);
		this._animRequested = true;
	},

	_resumeAnimation() {
		if (!this._animRequested) {
			this._animRequested = true;
			this._animId = L.Util.requestAnimFrame(function(timestamp) {
				this._animate(timestamp);
			}, this, true);
		}
	},

	_stopAnimation() {
		if(this._animRequested) {
			L.Util.cancelAnimFrame(this._animId);
			this._animRequested = false;
		}
	},

	_updatePosition() {
		let elapsedTime = Date.now() - this._startTime;
		this._animate(this._startTimeStamp + elapsedTime, true);
	},

	_loadLine(index) {
		this._currentIndex = index;
		this._currentDuration = this._durations[index];
		this._currentLine = this._points.slice(index, index + 2);
		this.fire('pointchange', { point: this._points[index] });
	},

	/**
	 * Load the line where the marker is
	 * @param  {Number} timestamp
	 * @return {Number} elapsed time on the current line or null if
	 * we reached the end or marker is at a station
	 */
	_updateLine(timestamp) {
		// time elapsed since the last latlng
		let elapsedTime = timestamp - this._startTimeStamp;

		// not enough time to update the line
		if (elapsedTime <= this._currentDuration) {
			return elapsedTime;
		}

		let lineIndex = this._currentIndex;
		let lineDuration = this._currentDuration;
		let stationDuration;

		while (elapsedTime > lineDuration) {
			// substract time of the current line
			elapsedTime -= lineDuration;
			stationDuration = this._stations[lineIndex + 1];

			// test if there is a station at the end of the line
			if (stationDuration !== undefined) {
				if (elapsedTime < stationDuration) {
					this.setLatLng(this._points[lineIndex + 1].latlng);
					return null;
				}
				elapsedTime -= stationDuration;
			}

			lineIndex++;

			// test if we have reached the end of the polyline
			if (lineIndex >= this._points.length - 1) {
				// place the marker at the end, else it would be at
				// the last position
				this.setLatLng(this._points[this._points.length - 1].latlng);
				this._loadLine(lineIndex);
				if (this.options.loop) {
					this.fire('loop', {progress: this.getProgress()});
					lineIndex = 0;
				} else {
					this.stop(elapsedTime);
					return null;
				}
			}
			this.setLatLng(this._points[lineIndex].latlng);
			this._loadLine(lineIndex);
			lineDuration = this._durations[lineIndex];
		}

		this._startTimeStamp = timestamp - elapsedTime;
		this._startTime = Date.now() - elapsedTime;
		return elapsedTime;
	},

	_animate(timestamp, noRequestAnim) {
		this._animRequested = false;
		let indx = this._currentIndex;
		// find the next line and compute the new elapsedTime
		let elapsedTime = this._updateLine(timestamp);
		this.fire('progresschange', { progress: this.getProgress() });
		if(!noRequestAnim && (this.isEnded() || this.isPaused())) {
			//in case anim stop or puase in event callbacks
			// no need to animate; else when noRequestAnim is true, it means
			// just update the position(ex: when seeking)
			return;
		}
		if(elapsedTime != null) {
			 // compute the position
			let p = this._interpolatePosition(
				L.latLng(this._currentLine[0].latlng),
				L.latLng(this._currentLine[1].latlng),
				this._currentDuration,
				elapsedTime
			);
			this.setLatLng(p);
		}
		if(!noRequestAnim) {
			this._animRequested = true;
			this._animId = L.Util.requestAnimFrame(this._animate, this, false);
		}
	},
});

L.markerPlayer = function (points, duration, options) {
	return new MarkerPlayer(points, duration, options);
};
