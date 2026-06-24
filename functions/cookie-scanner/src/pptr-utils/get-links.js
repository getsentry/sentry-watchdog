"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocialLinks = exports.dedupLinks = exports.getLinks = void 0;
const utils_1 = require("../helpers/utils");
const statics_1 = require("../helpers/statics");
const getLinks = async (page) => {
    return page.evaluate(() => {
        try {
            return [].map
                .call(document.querySelectorAll('a[href]'), a => {
                return {
                    href: a.href.split('#')[0], // link without fragment
                    inner_html: a.innerHTML.trim(),
                    inner_text: a.innerText
                };
            })
                .filter((link) => {
                return link.href.startsWith('http') && !link.href.endsWith('.pdf') && !link.href.endsWith('.zip');
            });
        }
        catch (error) {
            return [];
        }
    });
};
exports.getLinks = getLinks;
// Uses Set to remove duplicates by reducing LinkObjects to their href property, deduping via Set,
// then reconstituting an array of full LinkObjects
const dedupLinks = (links_with_duplicates) => {
    const sanitized_links = links_with_duplicates.filter(f => f && (0, utils_1.hasOwnProperty)(f, 'href')).map(link => link.href);
    const deduped_href_array = Array.from(new Set(sanitized_links));
    return deduped_href_array.map(href => links_with_duplicates.find(link => link.href === href));
};
exports.dedupLinks = dedupLinks;
const getSocialLinks = (links) => {
    const socialsRegex = new RegExp(`\\b(${statics_1.SOCIAL_URLS.join('|')})\\b`, 'i');
    return links.filter(link => {
        return link.href.match(socialsRegex);
    });
};
exports.getSocialLinks = getSocialLinks;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWxpbmtzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LWxpbmtzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDRDQUFrRDtBQUNsRCxnREFBaUQ7QUFFMUMsTUFBTSxRQUFRLEdBQUcsS0FBSyxFQUFFLElBQUksRUFBeUIsRUFBRTtJQUMxRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ3RCLElBQUksQ0FBQztZQUNELE9BQU8sRUFBRSxDQUFDLEdBQUc7aUJBQ1IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtnQkFDNUMsT0FBTztvQkFDSCxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsd0JBQXdCO29CQUNwRCxVQUFVLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUU7b0JBQzlCLFVBQVUsRUFBRSxDQUFDLENBQUMsU0FBUztpQkFDMUIsQ0FBQztZQUNOLENBQUMsQ0FBQztpQkFDRCxNQUFNLENBQUMsQ0FBQyxJQUFnQixFQUFFLEVBQUU7Z0JBQ3pCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RHLENBQUMsQ0FBQyxDQUFDO1FBQ1gsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDYixPQUFPLEVBQUUsQ0FBQztRQUNkLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQztBQWxCVyxRQUFBLFFBQVEsWUFrQm5CO0FBRUYsa0dBQWtHO0FBQ2xHLG1EQUFtRDtBQUM1QyxNQUFNLFVBQVUsR0FBRyxDQUFDLHFCQUFtQyxFQUFnQixFQUFFO0lBQzVFLE1BQU0sZUFBZSxHQUFHLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFBLHNCQUFjLEVBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pILE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0lBRWhFLE9BQU8sa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2xHLENBQUMsQ0FBQztBQUxXLFFBQUEsVUFBVSxjQUtyQjtBQUVLLE1BQU0sY0FBYyxHQUFHLENBQUMsS0FBbUIsRUFBZ0IsRUFBRTtJQUNoRSxNQUFNLFlBQVksR0FBRyxJQUFJLE1BQU0sQ0FBQyxPQUFPLHFCQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDekUsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUM7QUFMVyxRQUFBLGNBQWMsa0JBS3pCIn0=