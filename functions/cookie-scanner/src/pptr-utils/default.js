"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultPuppeteerBrowserOptions = exports.savePageContent = void 0;
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
const utils_1 = require("../helpers/utils");
const writeFile = (0, util_1.promisify)(fs_1.default.writeFile);
const savePageContent = async (index, outDir, page, screenshot = true) => {
    try {
        const html = await page.content();
        const outPath = (0, utils_1.safePath)(outDir, `${index}.html`);
        await writeFile(outPath, html);
        if (screenshot) {
            const outPathImg = (0, utils_1.safePath)(outDir, `${index}.jpeg`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRlZmF1bHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsNENBQW9CO0FBRXBCLCtCQUFpQztBQUNqQyw0Q0FBNEM7QUFFNUMsTUFBTSxTQUFTLEdBQUcsSUFBQSxnQkFBUyxFQUFDLFlBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUVuQyxNQUFNLGVBQWUsR0FBRyxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFVLEVBQUUsVUFBVSxHQUFHLElBQUksRUFBRSxFQUFFO0lBQ2xGLElBQUksQ0FBQztRQUNELE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xDLE1BQU0sT0FBTyxHQUFHLElBQUEsZ0JBQVEsRUFBQyxNQUFNLEVBQUUsR0FBRyxLQUFLLE9BQU8sQ0FBQyxDQUFDO1FBQ2xELE1BQU0sU0FBUyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvQixJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2IsTUFBTSxVQUFVLEdBQUcsSUFBQSxnQkFBUSxFQUFDLE1BQU0sRUFBRSxHQUFHLEtBQUssT0FBTyxDQUFDLENBQUM7WUFDckQsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzNFLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQThCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7QUFDTCxDQUFDLENBQUM7QUFaVyxRQUFBLGVBQWUsbUJBWTFCO0FBRUY7O0dBRUc7QUFDVSxRQUFBLDhCQUE4QixHQUFHO0lBQzFDLElBQUksRUFBRSxDQUFDLGNBQWMsRUFBRSx5QkFBeUIsRUFBRSw2QkFBNkIsRUFBRSw0Q0FBNEMsQ0FBQztJQUM5SCxlQUFlLEVBQUUsSUFBSTtJQUNyQixRQUFRLEVBQUUsSUFBSTtDQUNqQixDQUFDIn0=