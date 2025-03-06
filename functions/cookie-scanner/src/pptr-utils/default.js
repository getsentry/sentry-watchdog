"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCIAL_URLS = exports.defaultPuppeteerBrowserOptions = exports.savePageContent = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const writeFile = (0, util_1.promisify)(fs_1.default.writeFile);
const savePageContent = async (index, outDir, page, screenshot = true) => {
    try {
        const html = await page.content();
        const outPath = path_1.default.join(outDir, `${index}.html`);
        await writeFile(outPath, html);
        if (screenshot) {
            const outPathImg = path_1.default.join(outDir, `${index}.jpeg`);
            await page.screenshot({ path: outPathImg, type: 'jpeg', quality: 50 });
        }
    }
    catch (error) {
        console.log(`couldnt save page content: ${JSON.stringify(error)}`);
    }
};
exports.savePageContent = savePageContent;
/**
 * Default Puppeteer options for dev
 */
exports.defaultPuppeteerBrowserOptions = {
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors', '--autoplay-policy=no-user-gesture-required'],
    defaultViewport: null,
    headless: true
};
exports.SOCIAL_URLS = [
    'facebook.com',
    'linkedin.com',
    'twitter.com',
    'youtube.com',
    'instagram.com',
    'flickr.com',
    'tumblr.com',
    'snapchat.com',
    'whatsapp.com',
    'docs.google.com',
    'goo.gl',
    'pinterest.com',
    'bit.ly',
    'evernote.com',
    'eventbrite.com',
    'dropbox.com',
    'slideshare.net',
    'vimeo.com',
    'x.com',
    'bsky.app',
    'tiktok.com',
    'mastodon.social',
    'threads.net',
    'wechat.com',
    'messenger.com',
    'telegram.org',
    'douyin.com',
    'kuaishou.com',
    'weibo.com',
    'im.qq.com'
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRlZmF1bHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUV4QiwrQkFBaUM7QUFFakMsTUFBTSxTQUFTLEdBQUcsSUFBQSxnQkFBUyxFQUFDLFlBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUVuQyxNQUFNLGVBQWUsR0FBRyxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFVLEVBQUUsVUFBVSxHQUFHLElBQUksRUFBRSxFQUFFO0lBQ2xGLElBQUk7UUFDQSxNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsQyxNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEtBQUssT0FBTyxDQUFDLENBQUM7UUFDbkQsTUFBTSxTQUFTLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQy9CLElBQUksVUFBVSxFQUFFO1lBQ1osTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxLQUFLLE9BQU8sQ0FBQyxDQUFDO1lBQ3RELE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUMxRTtLQUNKO0lBQUMsT0FBTyxLQUFLLEVBQUU7UUFDWixPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUN0RTtBQUNMLENBQUMsQ0FBQztBQVpXLFFBQUEsZUFBZSxtQkFZMUI7QUFFRjs7R0FFRztBQUNVLFFBQUEsOEJBQThCLEdBQUc7SUFDMUMsSUFBSSxFQUFFLENBQUMsY0FBYyxFQUFFLHlCQUF5QixFQUFFLDZCQUE2QixFQUFFLDRDQUE0QyxDQUFDO0lBQzlILGVBQWUsRUFBRSxJQUFJO0lBQ3JCLFFBQVEsRUFBRSxJQUFJO0NBQ2pCLENBQUM7QUFFVyxRQUFBLFdBQVcsR0FBRztJQUN2QixjQUFjO0lBQ2QsY0FBYztJQUNkLGFBQWE7SUFDYixhQUFhO0lBQ2IsZUFBZTtJQUNmLFlBQVk7SUFDWixZQUFZO0lBQ1osY0FBYztJQUNkLGNBQWM7SUFDZCxpQkFBaUI7SUFDakIsUUFBUTtJQUNSLGVBQWU7SUFDZixRQUFRO0lBQ1IsY0FBYztJQUNkLGdCQUFnQjtJQUNoQixhQUFhO0lBQ2IsZ0JBQWdCO0lBQ2hCLFdBQVc7SUFDWCxPQUFPO0lBQ1AsVUFBVTtJQUNWLFlBQVk7SUFDWixpQkFBaUI7SUFDakIsYUFBYTtJQUNiLFlBQVk7SUFDWixlQUFlO0lBQ2YsY0FBYztJQUNkLFlBQVk7SUFDWixjQUFjO0lBQ2QsV0FBVztJQUNYLFdBQVc7Q0FDZCxDQUFDIn0=