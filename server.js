const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
app.use("/audio", express.static(path.join(__dirname, "audio")));

// 静态资源
app.use(express.static("public"));

// 🎧 语音接口
app.get("/api/voice", (req, res) => {
    const name = req.query.name;

    if (!name) {
        return res.status(400).json({
            error: "no name"
        });
    }

    const file = `voice_${name.replace(/\./g, "_")}.mp3`;
    const filePath = path.join(__dirname, "audio", file);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            error: "not found"
        });
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000");

    fs.createReadStream(filePath).pipe(res);
});

// 🎵 BGM（流式播放核心）
app.get("/api/bgm", (req, res) => {

    const filePath = "./audio/bgm.m4a";
    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    res.setHeader("Accept-Ranges", "bytes");

    if (!range) {
        // 🔥 强制返回部分内容（关键）
        const start = 0;
        const end = stat.size - 1;

        res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${stat.size}`,
            "Content-Length": stat.size,
            "Content-Type": "audio/mpeg",
        });

        fs.createReadStream(filePath).pipe(res);
        return;
    }

    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;

    const chunkSize = end - start + 1;

    res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "audio/mpeg",
    });

    fs.createReadStream(filePath, {
        start,
        end
    }).pipe(res);
});

app.listen(3001, "0.0.0.0", () => {
    console.log("服务器启动 http://0.0.0.0:3001");
});
