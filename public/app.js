// ========= 绑定 =========
const inputText = document.getElementById("inputText");
const btnPlay = document.getElementById("btnPlay");
const seekBar = document.getElementById("seekBar");
const timeText = document.getElementById("timeText");

const btnBgmPlay = document.getElementById("btnBgmPlay");
const bgmSeekBar = document.getElementById("bgmSeekBar");
const volumeBar = document.getElementById("volumeBar");
const loopSwitch = document.getElementById("loopSwitch");
const bgmTime = document.getElementById("bgmTime");
const volumeText = document.getElementById("volumeText");
const noticeText = document.getElementById("noticeText");
const btnSearch = document.getElementById("btnSearch");

// ========= 公告 =========
noticeText.innerText =
    "公告\n\n本软件功能需要依赖桌游本体\n地城扩展请加前缀DC(例如 DC2.1)\n多数内容为图像识别，可能不准确。\n反馈bug语音错误请发送邮箱 958987692@qq.com\n感谢使用 Web版 v0.0.5";

// ========= 工具 =========
function format(t) {
    if (!t || isNaN(t) || !isFinite(t))
        return "00:00";
    let m = Math.floor(t / 60);
    let s = Math.floor(t % 60);
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

// ========= Toast =========
function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2000);
}

// ========= loading =========
function setLoading(btn, loading) {
    if (loading) {
        btn.classList.add("loading");
    } else {
        btn.classList.remove("loading");
    }
}

// ================= 🎵 BGM =================
let bgm = new Audio("/audio/bgm.m4a");
bgm.preload = "auto";

bgm.onended = () => {

    // ⭐ 归零
    bgm.currentTime = 0;

    // ⭐ UI同步
    bgmSeekBar.value = 0;
    bgmTime.innerText =
        "00:00 / " + format(bgm.duration || 0);

    // ⭐ 按钮恢复播放状态
    btnBgmPlay.innerText = "▶";

    // ⭐ 防止loading残留
    setLoading(btnBgmPlay, false);
};

let isBgmSeeking = false;
let bgmSeekLock = 0;

// 播放按钮
btnBgmPlay.onclick = () => {

    if (bgm.paused) {

        if (bgm.readyState < 3) {
            setLoading(btnBgmPlay, true);
        }

        bgm.play().then(() => {
            btnBgmPlay.innerText = "⏸";
        }).catch(() => {
            setLoading(btnBgmPlay, false);
            showToast("BGM播放失败");
        });

    } else {
        bgm.pause();
        btnBgmPlay.innerText = "▶";
        setLoading(btnBgmPlay, false);
    }
};

bgm.onplaying = () => setLoading(btnBgmPlay, false);
bgm.onerror = () => setLoading(btnBgmPlay, false);

// 音量
volumeBar.oninput = (e) => {
    let v = e.target.value / 100;
    bgm.volume = v;
    volumeText.innerText = "音量 " + e.target.value + "%";
};

loopSwitch.onchange = (e) => {
    bgm.loop = e.target.checked;
};

// 拖动
bgmSeekBar.addEventListener("mousedown", () => isBgmSeeking = true);
bgmSeekBar.addEventListener("touchstart", () => isBgmSeeking = true);

bgmSeekBar.addEventListener("input", () => {
    let t = bgmSeekBar.value / 1000;
    bgmTime.innerText = format(t) + " / " + format(bgm.duration || 0);
});

function finishBgmSeek() {

    let newTime = bgmSeekBar.value / 1000;

    const wasPlaying = !bgm.paused;

    bgm.currentTime = newTime;

    if (wasPlaying) {
        if (bgm.readyState < 3) {
            setLoading(btnBgmPlay, true);
        }
        bgm.play();
    }

    isBgmSeeking = false;
    bgmSeekLock = Date.now() + 200;
}

bgmSeekBar.addEventListener("mouseup", finishBgmSeek);
bgmSeekBar.addEventListener("touchend", finishBgmSeek);

// ================= 🎧 语音（WebAudio） =================
const ctx = new(window.AudioContext || window.webkitAudioContext)();

let voiceBuffer = null;
let voiceSource = null;

let voiceStartTime = 0;
let voiceOffset = 0;

let isVoiceSeeking = false;
let voiceSeekLock = 0;

// ⭐ 播放状态
function isVoicePlaying() {
    return !!voiceSource;
}

// ⭐ 按钮同步
function updateVoiceBtn() {
    btnPlay.innerText = isVoicePlaying() ? "⏸" : "▶";
}

// ⭐ 停止
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

// ⭐ 播放
function playVoice(offset = 0) {

    if (!voiceBuffer)
        return;

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

        // ⭐ 关键：归零（解决跳回问题）
        voiceOffset = 0;
        voiceStartTime = 0;

        // ⭐ UI归零
        seekBar.value = 0;
        timeText.innerText =
            "00:00 / " + format(voiceBuffer.duration);

        updateVoiceBtn();
    };
}

// ⭐ 加载语音
async function loadVoice() {

    // ⭐ 点击查找 → 立即停止所有播放
    stopVoice();

   //if (!bgm.paused) {
    //    bgm.pause();
     //   bgm.currentTime = 0; // ⭐ 可选：回到开头
      //  btnBgmPlay.innerText = "▶";
      //  setLoading(btnBgmPlay, false);
 //  }

    let name = inputText.value.trim().replace(".", "_");

    if (!name) {
        showToast("请输入名称");
        return;
    }

    await ctx.resume();

    setLoading(btnPlay, true);

    try {
        const res = await fetch("/api/voice?name=" + name);
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

// ⭐ 播放/暂停
btnPlay.onclick = () => {

    if (!voiceBuffer) {
        showToast("请先查找语音");
        return;
    }

    if (isVoicePlaying()) {
        voiceOffset = ctx.currentTime - voiceStartTime;
        stopVoice();
    } else {
        playVoice(voiceOffset);
    }
};

// ⭐ 拖动
seekBar.addEventListener("mousedown", () => isVoiceSeeking = true);
seekBar.addEventListener("touchstart", () => isVoiceSeeking = true);

seekBar.addEventListener("input", () => {
    let t = seekBar.value / 1000;
    timeText.innerText =
        format(t) + " / " + format(voiceBuffer?.duration || 0);
});

function finishVoiceSeek() {

    if (!voiceBuffer)
        return;

    let newTime = seekBar.value / 1000;

    const wasPlaying = isVoicePlaying();

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

// ================= ⏱️ 刷新 =================
setInterval(() => {

    // 🎧 语音
    if (voiceBuffer) {

        let current;

        if (isVoicePlaying()) {
            current = ctx.currentTime - voiceStartTime;
        } else {
            current = voiceOffset;
        }

        if (current >= voiceBuffer.duration) {
            current = 0; // ⭐ 直接归零
        }

        seekBar.max = voiceBuffer.duration * 1000;

        if (!isVoiceSeeking && Date.now() > voiceSeekLock) {
            seekBar.value = current * 1000;

            timeText.innerText =
                format(current) + " / " + format(voiceBuffer.duration);
        }
    }

    // 🎵 BGM
    let dur = bgm.duration || 0;

    bgmSeekBar.max = dur * 1000;

    if (!isBgmSeeking && Date.now() > bgmSeekLock) {
        if (bgm.ended) {
            bgmSeekBar.value = 0;
            bgmTime.innerText =
                "00:00 / " + format(bgm.duration || 0);
        } else {
            bgmSeekBar.value = bgm.currentTime * 1000;
            bgmTime.innerText =
                format(bgm.currentTime) + " / " + format(dur);
        }

        bgmTime.innerText =
            format(bgm.currentTime) + " / " + format(dur);
    }

}, 100);
