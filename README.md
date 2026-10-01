# Cat-line — TikTok動画「ペットのLINEスタンプ作りませんか？」

LINEのトーク画面で、うちの子スタンプを実際に使っているところを見せる縦型動画（1080×1920, 30fps, 15.5秒）。

- 完成動画: `out/pet_line_sticker_tiktok.mp4`
- 0〜3秒: 「うちの子がLINEスタンプに！」の見出し＋スタンプが届くトーク画面
- 3〜11秒: スタンプ選択パネルからタップして送る流れ
- 11秒〜: 「自分のペットのLINEスタンプ創りませんか？ 気になる方はDMへ💌」

## 作り直し方
```sh
pip install pillow numpy scipy
python3 tools/crop_stickers.py          # assets/sticker_sheet.jpg → assets/stickers/*.png
mkdir -p node_modules && ln -sfn "$(npm root -g)/playwright" node_modules/playwright
node tools/render.mjs                   # → out/pet_line_sticker_tiktok.mp4
node tools/render.mjs --stills 0,3,8    # 確認用の静止画
```
セリフやタイミングは `video/index.html` の `MSGS` / `TAPS` を編集。
