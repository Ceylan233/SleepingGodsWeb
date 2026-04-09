const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");

app.use(express.static("public"));
app.use("/audio", express.static(path.join(__dirname, "audio")));

function streamAudio(req, res, filePath) {
	if (!fs.existsSync(filePath)) {
		return res.status(404).json({
			error: "not found",
			filePath
		});
	}

	const stat = fs.statSync(filePath);
	const range = req.headers.range;
	const ext = path.extname(filePath).toLowerCase();

	let contentType = "audio/mpeg";
	if (ext === ".m4a") contentType = "audio/mp4";
	if (ext === ".mp3") contentType = "audio/mpeg";

	res.setHeader("Accept-Ranges", "bytes");
	res.setHeader("Cache-Control", "public, max-age=31536000");

	if (!range) {
		res.writeHead(206, {
			"Content-Range": `bytes 0-${stat.size - 1}/${stat.size}`,
			"Content-Length": stat.size,
			"Content-Type": contentType
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
		"Content-Type": contentType
	});

	fs.createReadStream(filePath, {
		start,
		end
	}).pipe(res);
}

function safeJoin(base, ...parts) {
	const target = path.normalize(path.join(base, ...parts));
	const normalizedBase = path.normalize(base);
	if (!target.startsWith(normalizedBase)) {
		return null;
	}
	return target;
}

const gameMap = {
	sleepinggods: "SleepingGods",
	kongji: "空寂之钟",
	shaxue: "沙穴之城"
};

const kongjiTypeMap = {
	investigate: "调查卡牌",
	core: "核心卡牌",
	discuss: "讨论卡牌"
};

const shaxueTypeMap = {
	investigate: "调查牌组",
	core: "核心牌组",
	discuss: "讨论牌组"
};

app.get("/api/bgm", (req, res) => {
	const game = String(req.query.game || "").toLowerCase();

	if (!gameMap[game]) {
		return res.status(400).json({
			error: "invalid game"
		});
	}

	const filePath = safeJoin(__dirname, "audio", gameMap[game], "bgm.m4a");
	if (!filePath) {
		return res.status(400).json({
			error: "bad path"
		});
	}

	streamAudio(req, res, filePath);
});

app.get("/api/voice", (req, res) => {
	const game = String(req.query.game || "").toLowerCase();
	const name = String(req.query.name || "").trim();

	if (!gameMap[game]) {
		return res.status(400).json({
			error: "invalid game"
		});
	}

	if (!name) {
		return res.status(400).json({
			error: "no name"
		});
	}

	if (game === "sleepinggods") {
		const safeName = name.replace(/\./g, "_");
		const candidates = [
			safeJoin(__dirname, "audio", "SleepingGods", `voice_${safeName}.mp3`),
			safeJoin(__dirname, "audio", "SleepingGods", `voice_${safeName}.m4a`)
		].filter(Boolean);

		const filePath = candidates.find(p => fs.existsSync(p));
		if (!filePath) {
			return res.status(404).json({
				error: "not found"
			});
		}

		return streamAudio(req, res, filePath);
	}

	return res.status(400).json({
		error: "use /api/card-audio for this game"
	});
});

app.get("/api/card-audio", (req, res) => {
	const game = String(req.query.game || "").toLowerCase();
	const type = String(req.query.type || "").toLowerCase();
	const id = String(req.query.id || "").trim();

	if (!["kongji", "shaxue"].includes(game)) {
		return res.status(400).json({
			error: "invalid game"
		});
	}

	if (!id) {
		return res.status(400).json({
			error: "no id"
		});
	}

	let folderName = "";
	if (game === "kongji") {
		folderName = kongjiTypeMap[type];
	}
	if (game === "shaxue") {
		folderName = shaxueTypeMap[type];
	}

	if (!folderName) {
		return res.status(400).json({
			error: "invalid type"
		});
	}

	const cleanId = id.replace(/[^0-9A-Za-z_-]/g, "");
	const filePath = safeJoin(__dirname, "audio", gameMap[game], folderName, `${cleanId}.m4a`);

	if (!filePath) {
		return res.status(400).json({
			error: "bad path"
		});
	}

	streamAudio(req, res, filePath);
});

app.listen(3001, "0.0.0.0", () => {
	console.log("服务器启动 http://127.0.0.1:3001");
});