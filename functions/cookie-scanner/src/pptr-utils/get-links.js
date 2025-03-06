"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocialLinks = exports.dedupLinks = exports.getLinks = void 0;
const utils_1 = require("../utils");
const default_1 = require("./default");
const getLinks = async (page) => {
    return page.evaluate(() => {
        try {
            return [].map
                .call(document.querySelectorAll('a[href]'), a => {
                return {
                    href: a.href.split('#')[0],
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
    const spRegex = new RegExp(`\\b(${default_1.SOCIAL_URLS.join('|')})\\b`, 'i');
    return links.filter(link => {
        return link.href.match(spRegex);
    });
};
exports.getSocialLinks = getSocialLinks;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWxpbmtzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LWxpbmtzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG9DQUEwQztBQUMxQyx1Q0FBd0M7QUFFakMsTUFBTSxRQUFRLEdBQUcsS0FBSyxFQUFFLElBQUksRUFBeUIsRUFBRTtJQUMxRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ3RCLElBQUk7WUFDQSxPQUFPLEVBQUUsQ0FBQyxHQUFHO2lCQUNSLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7Z0JBQzVDLE9BQU87b0JBQ0gsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDMUIsVUFBVSxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFO29CQUM5QixVQUFVLEVBQUUsQ0FBQyxDQUFDLFNBQVM7aUJBQzFCLENBQUM7WUFDTixDQUFDLENBQUM7aUJBQ0QsTUFBTSxDQUFDLENBQUMsSUFBZ0IsRUFBRSxFQUFFO2dCQUN6QixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0RyxDQUFDLENBQUMsQ0FBQztTQUNWO1FBQUMsT0FBTyxLQUFLLEVBQUU7WUFDWixPQUFPLEVBQUUsQ0FBQztTQUNiO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUM7QUFsQlcsUUFBQSxRQUFRLFlBa0JuQjtBQUVGLGtHQUFrRztBQUNsRyxtREFBbUQ7QUFDNUMsTUFBTSxVQUFVLEdBQUcsQ0FBQyxxQkFBbUMsRUFBZ0IsRUFBRTtJQUM1RSxNQUFNLGVBQWUsR0FBRyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBQSxzQkFBYyxFQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNqSCxNQUFNLGtCQUFrQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztJQUVoRSxPQUFPLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNsRyxDQUFDLENBQUM7QUFMVyxRQUFBLFVBQVUsY0FLckI7QUFFSyxNQUFNLGNBQWMsR0FBRyxDQUFDLEtBQW1CLEVBQWdCLEVBQUU7SUFDaEUsTUFBTSxPQUFPLEdBQUcsSUFBSSxNQUFNLENBQUMsT0FBTyxxQkFBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3BFLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUN2QixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3BDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDO0FBTFcsUUFBQSxjQUFjLGtCQUt6QiJ9