const inputText = document.getElementById("inputText");
const btnPlay = document.getElementById("btnPlay");
const seekBar = document.getElementById("seekBar");
const timeText = document.getElementById("timeText");
const btnSearch = document.getElementById("btnSearch");
const noticeText = document.getElementById("noticeText");

noticeText.innerText =
	"公告\n需要桌游本体\n输入编号播放语音\n例如：1 / 1B\n请确认卡牌类别与编号一致";

function format(t) {
	if (!t || isNaN(t) || !isFinite(t)) return "00:00";
	let m = Math.floor(t / 60);
	let s = Math.floor(t % 60);
	return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function showToast(msg) {
	const toast = document.getElementById("toast");
	toast.innerText = msg;
	toast.classList.add("show");
	setTimeout(() => toast.classList.remove("show"), 2000);
}

function setLoading(btn, loading) {
	if (loading) {
		btn.classList.add("loading");
	} else {
		btn.classList.remove("loading");
	}
}

const ctx = new(window.AudioContext || window.webkitAudioContext)();

let voiceBuffer = null;
let voiceSource = null;

let voiceStartTime = 0;
let voiceOffset = 0;

let isVoiceSeeking = false;
let voiceSeekLock = 0;

function isVoicePlaying() {
	return !!voiceSource;
}

function updateVoiceBtn() {
	btnPlay.innerText = isVoicePlaying() ? "⏸" : "▶";
}

function stopVoice() {
	if (voiceSource) {
		try {
			voiceSource.onended = null;
			voiceSource.stop();
		} catch (e) {}
		voiceSource = null;
	}
	updateVoiceBtn();
}

function playVoice(offset = 0) {
	if (!voiceBuffer) return;

	stopVoice();

	const source = ctx.createBufferSource();
	source.buffer = voiceBuffer;
	source.connect(ctx.destination);

	voiceStartTime = ctx.currentTime - offset;
	voiceOffset = offset;

	source.start(0, offset);
	voiceSource = source;

	updateVoiceBtn();
	setLoading(btnPlay, false);

	source.onended = () => {
		voiceSource = null;
		voiceOffset = 0;
		voiceStartTime = 0;
		seekBar.value = 0;
		timeText.innerText = "00:00 / " + format(voiceBuffer.duration);
		updateVoiceBtn();
	};
}

async function loadVoice() {
	stopVoice();

	let name = inputText.value.trim();
	if (!name) {
		showToast("请输入编号");
		return;
	}

	const type = document.querySelector("input[name=type]:checked").value;

	await ctx.resume();

	setLoading(btnPlay, true);

	try {
		const res = await fetch(`/api/card-audio?game=kongji&type=${type}&id=${name}`);
		if (!res.ok) throw new Error("not found");

		const buffer = await ctx.decodeAudioData(await res.arrayBuffer());

		voiceBuffer = buffer;
		voiceOffset = 0;

		playVoice(0);
	} catch {
		setLoading(btnPlay, false);
		showToast("未找到语音");
	}
}

btnSearch.onclick = loadVoice;

btnPlay.onclick = () => {
	if (!voiceBuffer) {
		showToast("请先查找");
		return;
	}

	if (isVoicePlaying()) {
		voiceOffset = ctx.currentTime - voiceStartTime;
		stopVoice();
	} else {
		playVoice(voiceOffset);
	}
};

seekBar.addEventListener("mousedown", () => isVoiceSeeking = true);
seekBar.addEventListener("touchstart", () => isVoiceSeeking = true);

seekBar.addEventListener("input", () => {
	let t = seekBar.value / 1000;
	timeText.innerText = format(t) + " / " + format(voiceBuffer?.duration || 0);
});

function finishVoiceSeek() {
	if (!voiceBuffer) return;

	let newTime = seekBar.value / 1000;

	stopVoice();

	voiceOffset = newTime;
	voiceStartTime = ctx.currentTime - newTime;

	setLoading(btnPlay, true);
	playVoice(newTime);

	isVoiceSeeking = false;
	voiceSeekLock = Date.now() + 300;
}

seekBar.addEventListener("mouseup", finishVoiceSeek);
seekBar.addEventListener("touchend", finishVoiceSeek);

setInterval(() => {
	if (voiceBuffer) {
		let current;

		if (isVoicePlaying()) {
			current = ctx.currentTime - voiceStartTime;
		} else {
			current = voiceOffset;
		}

		seekBar.max = voiceBuffer.duration * 1000;

		if (!isVoiceSeeking && Date.now() > voiceSeekLock) {
			seekBar.value = current * 1000;
			timeText.innerText = format(current) + " / " + format(voiceBuffer.duration);
		}
	}
}, 100);