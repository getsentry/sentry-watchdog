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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRlZmF1bHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsNENBQW9CO0FBRXBCLCtCQUFpQztBQUNqQyw0Q0FBNEM7QUFFNUMsTUFBTSxTQUFTLEdBQUcsSUFBQSxnQkFBUyxFQUFDLFlBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUVuQyxNQUFNLGVBQWUsR0FBRyxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFVLEVBQUUsVUFBVSxHQUFHLElBQUksRUFBRSxFQUFFO0lBQ2xGLElBQUk7UUFDQSxNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsQyxNQUFNLE9BQU8sR0FBRyxJQUFBLGdCQUFRLEVBQUMsTUFBTSxFQUFFLEdBQUcsS0FBSyxPQUFPLENBQUMsQ0FBQztRQUNsRCxNQUFNLFNBQVMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0IsSUFBSSxVQUFVLEVBQUU7WUFDWixNQUFNLFVBQVUsR0FBRyxJQUFBLGdCQUFRLEVBQUMsTUFBTSxFQUFFLEdBQUcsS0FBSyxPQUFPLENBQUMsQ0FBQztZQUNyRCxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7U0FDMUU7S0FDSjtJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ1osT0FBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDdEU7QUFDTCxDQUFDLENBQUM7QUFaVyxRQUFBLGVBQWUsbUJBWTFCO0FBRUY7O0dBRUc7QUFDVSxRQUFBLDhCQUE4QixHQUFHO0lBQzFDLElBQUksRUFBRSxDQUFDLGNBQWMsRUFBRSx5QkFBeUIsRUFBRSw2QkFBNkIsRUFBRSw0Q0FBNEMsQ0FBQztJQUM5SCxlQUFlLEVBQUUsSUFBSTtJQUNyQixRQUFRLEVBQUUsSUFBSTtDQUNqQixDQUFDIn0=