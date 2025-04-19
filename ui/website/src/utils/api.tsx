import axios from "axios";
import { getJumpTarget, initServerJumpTargetConfig } from "./setting";

const baseUrl = "/api/";
// const baseUrl = "https://tools.mereith.com/api/";

const selfJumpIcon = `data:image/png;base64,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`
const blankJumpIcon = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMwAAADICAYAAACksw7kAAAAAXNSR0IArs4c6QAACgdJREFUeF7tnQ1y2zYQRuWr9CJpT+bkZElP1s7aokMpFIkFsB+XwONMx9MJiJ+HfV4Aoui3GxcEIFBM4K24JAUhAIEbwhAEEHAQQBgHLIpCAGGIAQg4CCCMAxZFIYAwxAAEHAQQxgGLohBAGGIAAg4CCOOARVEIIAwxAAEHAZUwfzv6RNE6Ar/qbuMuD4HewpgY9t+3+09PXyjbh8Aizo97dYjUh+tHLb2E+X673d479ouq+hEwYUwexOnAtFUYROkwCcIqTBybM65KArXCIEol8AS3kXEaJsErjO1PbOnFJr4BepJbTZx/kvTlMt3wCENWucy0ujpq0rC/KURWKgyyFAK9aDGkKZy4EmGQpRDmxYtxIFAwgUfCIEsBxIGKIM3BZO4JgywDmeAYCtLswHolDLI4ImzAouxpXkzqljB2ZPxzwCBgSOUEOHJ2CGOy8DlLeXCNWpKl2cbMPmcYlmKjhn/duI4OhepqvfBdayAsxS48kUFdJ8s8gV0Lw1IsKOouXi3SrCZwLcx/F59Yuh9DAGE2hGE5FhNso9TKXuY+kwsIlmOjhHbMOMgyK2HILjFBNlKtCIMwI8WzZCwsy+7f6eezF0m8Xb4RhEGYywexcgA8X3YXRrHhZw0cG9qKfSjCIExsFAtrVwjDLz2EEYZ0bFMIE8v3q3bbyLEkE8EObAZhAuGuq0YYEejgZhAmGPBSPcKIQAc3gzDBgBFGBFjUDMKIQJNhRKCDm0GYYMBkGBFgUTMIIwJNhhGBDm4GYYIBk2FEgEXNIIwINBlGBDq4GYQJBkyGEQEWNYMwItBkGBHo4GYQJhgwGUYEWNQMwohAk2FEoIObQZhgwOoMw3cpYicUYWL5ftWuyjAIEzuhCBPLF2FEfFXNIIyINBlGBDq4GYQJBsweRgRY1AzCiECTYUSgg5tBmGDAZBgRYFEzCCMCTYYRgQ5uBmGCAZNhRIBFzSCMCDQZRgQ6uBmECQZMhhEBFjWDMCLQZBgR6OBmECYYMBlGBFjUzFWEsX4u1y8Rm67NkGG64jytsuzCbP1JFRPG3td8KXEQ5rQY79pwdmH2/uDwpV5yjjBd4/a0yjILU/IHuy4jDcKcFuNdG84sTOnL7m1pZl8DSX0hTOrpKe5cZmH2lmPPA0y/r0GY4phMXbBk2dM6gNplk0eYpY9pv3CIMK1hlOP+0YQxqrWChs4IwoTilVU+ojAppUEYWUyHNjSqMAYt1WEAwoTGsazy9SfoUY3WfsBYs4fZOgxIcYKGMFHhRb1GoPfp3emHAQhDYEcS6C3M6fsahIkMF+qOEOZUaRCGoI4kECXMadIgTGS4UHekMKecoCEMQR1JIFqYRRrZ1wQQJjJcqFshzEJZcoKGMAR1JAGlMJJ9DcJEhgt1K55AeKYc+gwawhDUkQTOECY00yBMZLhQd+mXxyJIhTyDhjARU0WdRuCs7LKm310ahCG4exMwUb7dnyPrXXdtfd1O0BBmewqWp38VTwHXBkGm+7IJssWmizQI84g2wzIikwij9aX5BA1hPkMCUUZT4/V4mqRBmP7f2Zgn9K470mppEOZ2O/Po87ohd/2eV52gzS6M+tGN64fZWCNwvwdtdmHYu4wlQO1oik/QZheG5VhtiI13X9G+BmE+N/1cEDACh9IgDMKgyiOB3cMAhEEYhPmTwMvDAIRBGIR5TeCPw4DZhenxVkYCbmwCD/sahBl7shldHwJfmQZh+gCllvEJfEiDMONPNCPsQ+BjaYYwfWBSyxwE3hBmjolmlH0I/IUwfUBSyxwEEGaOeWaUnQhMvyTj4ctOkTRBNR+PzMy+JEOYCSK9wxC/ni9DGB6N6RBPQ1fx8DAmwiDM0NHeYXAPz5MhDMJ0iKkhq9h8zB9hEGbIaG8c1MsvkiEMwjTG1nC3737rEmEQZriIbxgQX1E+gMexckN0DXZr0ZtjZs8wvGZpsKivGI7rhX4Ic7u9V0DmljEIuGSxIc8uDG++HCPwa0ZxuF/ZqnR2YYwJ+5iacLv2PVWykGF+Tzovw7i2AJ7eV8uCML8xszTzhNx1yzbJgjCPE2/S2AEAr469rhB7PW+WBWFe4zVp7D/7240ZLiRum4UusiBM2yRw9yeBtczLEX0mwbvJgjCEfBSBLCePXWVBmKhwoV4jcLY0RY+6eKeKz2G8xChfSuDMx45CZCHDlE495WoInCGM+1EX78DIMF5ilC8loP5sK1wWMkzp1FOuhoBSGIksCFMTBtxTSkAlTPeTsL0BsiQrnX7K1RCIfkZPKgsZpiYEuMdDIFIYuSwI45l6ytYQiBLmFFkQpiYEuMdDIEKY02RBGM/U5y67PGkd2ct/7S9wORvoLcypsiCMc/YTF1d8SFgTrD0fjwn79N4zr5ySeWjlLTu6MClkIcPkFcDbs1GFkX0gWQqcDFNKKne5EYVJJwsZJrcEnt6NJkzNfsnDq7osGaYaXaobswpTc0qWVhYyTKqYb+rMKMKklgVhmmI01c1XF8b2KyaL/Ux9sSRLPT3FncsqTEm/0meV9SwgTHFMpi5YEpitA6gJ7L1+1dTXOobm+xGmGWGKCrIKY3Csb/Z+N3t8xySxy5Ze6ZdfWzOLMCnivbkTmYVpHlymChAm02zU9wVh6tm57kQYF660hRFGNDUIIwId3AzCBANeqkcYEejgZhAmGDDCiACLmkEYEWgyjAh0cDMIEwyYDCMCLGoGYUSgyTAi0MHNIEwwYDKMCLCoGYQRgSbDiEAHN4MwwYDJMCLAomYQRgSaDCMCHdwMwgQDJsOIAIuaQRgRaDKMCHRwMwgTDJgMIwIsagZhRKDJMCLQwc0gTDBgMowIsKgZhBGBJsOIQAc3gzDBgMkwIsCiZhBGBJoMIwId3AzCBAMmw4gAi5pBGBFoMowIdHAzCBMMmAwjAixqBmFEoMkwItDBzSBMMGAyjAiwqBmEEYFWZRh7Laj9FV6uGALLq1hjav+sNc3fmYwc5FHdKmGO+sG/5yeAMLfbzYRRpPP84UAPjwggDMIcxQj/viKAMAiDEA4CthqZ/jII9nc7fk5PAgBHBBDmnmEMVM1fuz0CzL+PQ8BOOW1JNv21/NZg4z99KOwCQJg7HoRBlBICbPifhGFZVhI285Zh/7IhDMuyeYXYGznLsRWd598cbP6R5pkAy7EdYcgyCPNMgOXYjjDsZRBmTeDH/dEpqGzsYRYoZBnCwwiwd9mIg1fpFmmQhr2LQxgrijTzSkN2eTH3Rxs6e8bMnjXjmocAsuzM9ZEwdivSzCOLjZSlWKMwSDOPMMhyMNclGYbTs/GFsWWYHSHbT64OGQZpxg0jPmtxzK0nw6yr5QTNATlxUWRxTk6tMGQcJ+hExU0Su+yXHpeTQKswS3N29Px+/x+OoZ2TICi+vBfOfrJPaQDeS5h1FxZh7Ke9YI5LS2D9wkQE6cz+f24kwClVvFcwAAAAAElFTkSuQmCC`
export const FetchList = async () => {
    // 设置请求头部信息
    const headers = {
        'Token': localStorage.getItem('_token')
    };
    const { data: raw } = await axios.get(baseUrl, {headers});
    const { data } = raw;
    // 获取分类
    const catelogs = [];
    const tools = [];
    catelogs.push("全部工具")
    data.catelogs.forEach(item => {
        catelogs.push(item.name)
    })
    data.tools.forEach(item => {
        // 如果工具所属分类不存在，则增加分类
        // 2024-05-29，只对未分类的工具进行分类，已分类但是没有查到对应分类的，大概是是隐藏了分类，不做展示
        if (!item.catelog) {
            item.catelog = "未分类"   
            tools.push(item);
            if (!catelogs.includes(item.catelog)) {
                catelogs.push(item.catelog);
            }
        } else {
            if (catelogs.includes(item.catelog)) {
                tools.push(item);
            }
        }
        // 提醒：不做分类展示，仍然会在全部工具中显示
    });
    if (data.setting) {
        initServerJumpTargetConfig(data.setting)
    }

    const jumpTarget = getJumpTarget();

    tools.push({
        id: 999099999978,
        catelogs: "偏好设置",
        name: jumpTarget === "blank" ? "新建窗口" : "原地跳转",
        desc: `点击切换跳转方式`,
        url: "toggleJumpTarget",
        logo: jumpTarget === "blank" ? blankJumpIcon : selfJumpIcon
    })

    data.tools = tools;
    data.catelogs = catelogs;
    return data;
};

export default FetchList;


