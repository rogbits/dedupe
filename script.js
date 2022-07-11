document.addEventListener('DOMContentLoaded', main);

let unitSize = 1e4;
let numUnits = 100;
let maxCharLength = Math.floor(
	Math.log10(unitSize * numUnits)) + 1;

let charts = {};
let report = {};
let functions = [
	inPlaceSplice,
	newArrayWithPush,
	newArrayFixedWithSlice,
	newArrayFixedWithSplice,
	filter
];

function main() {
	let main = document.querySelector('main');
	let labels = Array
		.from({length: numUnits})
		.map((_, i) => (i + 1) * unitSize);

	for (let fn of functions) {
		let name = fn.name;
		for (let input of ['Unique', 'Repeat']) {
			for (let type of ['Time', 'Space']) {
				let div = document.createElement('div');
				let header = document.createElement('header');
				let canvas = document.createElement('canvas');
				header.innerText = name + input + type;
				div.classList.add('chart');
				canvas.id = name + input + type;
				div.appendChild(header);
				div.appendChild(canvas);
				main.appendChild(div);
			}
		}
	}

	let canvases = document.querySelectorAll('canvas');
	for (let canvas of canvases) {
		canvas.width = canvas.parentElement.clientWidth;
	}

	for (let fn of functions) {
		for (let input of ['Unique', 'Repeat']) {
			for (let type of ['Time', 'Space']) {
				let name = fn.name;
				charts[name + input + type] = makeChart(name, input, type, labels);
			}
		}
	}

	let isRunning = false;
	let runButton = document.querySelector('button.run');
	runButton.addEventListener('click', async () => {
		if (isRunning) {
			return;
		}
		try {
			isRunning = true;
			await onClick();
			isRunning = false;
		} catch (e) {
			alert(e.message);
		}
	});

	let reportPane = document.querySelector('aside.report');
	let reportButton = document.querySelector('button.report');
	let reportCloseButton = document.querySelector('button.report-close');
	reportButton.addEventListener('click', () => {
		reportPane.classList.toggle('on');
	});
	reportCloseButton.addEventListener('click', () => {
		reportPane.classList.toggle('on');
	});
}

async function onClick() {
	for (let fn of functions) {
		for (let input of ['Unique', 'Repeat']) {
			let time = [];
			let space = [];
			let name = fn.name;
			report[name + input] = {};
			performance.mark('total');
			document.querySelector(`#${name}${input}Time`)
				.scrollIntoView(false);

			for (let i = 1; i <= numUnits; i++) {
				let arr;
				arr = input === 'Unique'
					? Array.from({length: unitSize * i}).map(
						(_, i) => String(i).padStart(maxCharLength, '0'))
					: Array.from({length: unitSize * i})
						.fill('a'.repeat(maxCharLength));
				performance.mark('start');
				let heapStart = getHeapInMegs();
				let heapEnd = fn(arr);
				let duration = performance
					.measure('', 'start')
					.duration
					.toFixed(0);
				let heapUsed = heapEnd - heapStart < 0 ? -1 : heapEnd - heapStart;
				report[name + input]['maxTime'] = Math.max(
					report[name + input]['maxTime'] || 0,
					duration
				);
				report[name + input]['maxSpace'] = Math.max(
					report[name + input]['maxSpace'] || 0,
					heapUsed
				);
				space.push(heapUsed);
				time.push(duration);
				charts[name + input + 'Time'].data.datasets[0].data = time;
				charts[name + input + 'Space'].data.datasets[0].data = space;
				charts[name + input + 'Time'].update();
				charts[name + input + 'Space'].update();
				await pause(10);
			}

			report[name + input]['total'] = (performance.measure('total', 'total')
				.duration / 1000).toFixed(0);
		}
	}

	// final report
	let output = '';
	let table = document.createElement('table');
	let tr = document.createElement('tr');
	for (let column of ['fn', 'total (sec)', 'maxTime (ms)', 'maxSpace (meg)']) {
		let th = document.createElement('th');
		th.innerText = column;
		tr.appendChild(th);
	}
	table.appendChild(tr);

	for (let fnName of Object.keys(report)) {
		let tr = document.createElement('tr');
		let td = document.createElement('td');
		td.innerText = fnName;
		tr.appendChild(td);
		for (let key of ['total', 'maxTime', 'maxSpace']) {
			let td = document.createElement('td');
			td.innerText = report[fnName][key];
			tr.appendChild(td);
		}
		table.appendChild(tr);
	}

	let reportTableEl = document.querySelector('.report-table');
	let reportButton = document.querySelector('button.report');
	reportTableEl.innerHTML = table.outerHTML;
	reportButton.click();
}

function inPlaceSplice(arr) {
	let set = new Set();
	for (let i = arr.length - 1; i >= 0; i--) {
		if (set.has(arr[i])) {
			arr.splice(i, 1);
		} else {
			set.add(arr[i]);
		}
	}
	return getHeapInMegs();
}

function newArrayWithPush(arr) {
	let dedupe = [];
	let set = new Set();
	for (let i = 0; i < arr.length; i++) {
		if (set.has(arr[i])) {
			continue;
		}
		set.add(arr[i]);
		dedupe.push(arr[i]);
	}
	return getHeapInMegs();
}

function newArrayFixedWithSlice(arr) {
	let set = new Set();
	let dedupe = Array.from({length: arr.length});
	let j = 0;
	for (let i = 0; i < arr.length; i++) {
		if (set.has(arr[i])) {
			continue;
		}
		set.add(arr[i]);
		dedupe[j] = arr[i];
		j++;
	}
	let sliced = dedupe.slice(0, j);
	return getHeapInMegs();
}

function newArrayFixedWithSplice(arr) {
	let set = new Set();
	let dedupe = Array.from({length: arr.length});
	let j = 0;
	for (let i = 0; i < arr.length; i++) {
		if (set.has(arr[i])) {
			continue;
		}
		set.add(arr[i]);
		dedupe[j] = arr[i];
		j++;
	}
	dedupe.splice(0, j);
	return getHeapInMegs();
}

function filter(arr) {
	let set = new Set();
	let filtered = arr.filter((el) => {
		if (set.has(el)) {
			return false;
		} else {
			set.add(el);
			return true;
		}
	});
	return getHeapInMegs();
}

function makeChart(name, input, type, labels) {
	const ctx = document.getElementById(
		name + input + type).getContext('2d');
	return new Chart(ctx, {
		type: 'line',
		data: {
			labels: labels,
			datasets: [
				{
					label: type === 'Time'
						? 'time milliseconds'
						: 'space megs',
					data: [],
					fill: false,
					borderColor: type === 'Time'
						? 'red'
						: 'blue'
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
	return Math.floor(window.performance.memory.usedJSHeapSize / 1e6);
}

function pause(n) {
	return new Promise(resolve =>
		setTimeout(resolve, n));
}
