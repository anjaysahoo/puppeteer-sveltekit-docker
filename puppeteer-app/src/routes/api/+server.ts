import puppeteer from 'puppeteer';

export async function GET() {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto('https://www.w3schools.com/howto/tryhow_css_example_website.htm');
    const img = await page.screenshot({ path: 'example.png' });
    await browser.close();

    return new Response(img);
}
