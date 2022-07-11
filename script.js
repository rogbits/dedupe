document.addEventListener('DOMContentLoaded', main);

let spliceChart;
let newArrayChart;
let intervalSize = 1e5;
let numIntervals = 100;

function main() {
	let labels = Array
		.from({length: numIntervals})
		.map((_, i) => (i + 1) * intervalSize);

	spliceChart = makeChart('splice',
		labels, [], []);
	newArrayChart = makeChart('newArray',
		labels, [], []);

	let runButton = document.querySelector('button');
	runButton.addEventListener('click', async () => {
		try {
			await onClick();
		} catch (e) {
			alert(e.message);
		}
	});
}

async function onClick() {
	for (let [func, chart] of [
		[spliceDedupe, spliceChart],
		[newArrayDedupe, newArrayChart]
	]) {
		let time = [];
		let space = [];
		for (let i = 1; i <= numIntervals; i++) {
			let arr;
			if (func === spliceDedupe) {
				// worst case
				arr = Array.from({length: intervalSize * i}).fill('a');
			}
			if (func === newArrayDedupe) {
				// worst case
				arr = Array.from({length: intervalSize * i}).map((_, i) => String(i));
			}
			performance.mark('start');
			let heapStart = performance.memory.usedJSHeapSize;
			let heapEnd = func(arr);
			let duration = performance
				.measure('', 'start')
				.duration
				.toFixed(0);
			let heapUse = ((heapEnd - heapStart) / 1e6).toFixed(2);
			space.push(heapUse < 0 ? 0 : heapUse);
			time.push(duration);
			chart.data.datasets[0].data = time;
			chart.data.datasets[1].data = space;
			chart.update();
			await pause(10);
		}
	}
}

function newArrayDedupe(arr) {
	let dedupe = [];
	let set = new Set();
	for (let char of arr) {
		if (set.has(char)) {
			continue;
		}
		set.add(char);
		dedupe.push(char);
	}
	return performance.memory.usedJSHeapSize;
}

function spliceDedupe(arr) {
	let set = new Set();
	for (let i = arr.length - 1; i >= 0; i--) {
		if (set.has(arr[i])) {
			arr.splice(i, 1);
		} else {
			set.add(arr[i]);
		}
	}
	return performance.memory.usedJSHeapSize;
}

function makeChart(id, labels, timeData, spaceData) {
	const ctx = document.getElementById(id).getContext('2d');
	return new Chart(ctx, {
		type: 'line',
		data: {
			labels: labels,
			datasets: [
				{
					label: 'time milliseconds',
					data: timeData,
					fill: false,
					borderColor: 'red'
				},
				{
					label: 'space megs',
					data: spaceData,
					fill: false,
					borderColor: 'blue'
				}
			]
		},
		options: {
			animation: false,
			scales: {
				y: {
					beginAtZero: true
				}
			}
		}
	});
}

function getHeapInMegs() {
	return (window.performance.memory.usedJSHeapSize / 1e6).toFixed(2);
}

function pause(n) {
	return new Promise(resolve =>
		setTimeout(resolve, n));
}

window.onerror = (message) => {
	console.log('hit');
	alert(message);
};
