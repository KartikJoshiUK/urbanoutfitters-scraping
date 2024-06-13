const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

puppeteer.use(StealthPlugin());

console.log("Initializing the scraper");

async function main(url) {
  console.log(`Scraping ${url}`);

  const browser = await puppeteer.launch({
    headless: false,
  });

  const page = await browser.newPage();

  async function loadPage(page, url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await page.goto(url, {
          timeout: 60000,
          waitUntil: "networkidle2",
        });

        await autoScroll(page);

        await page.waitForSelector(".c-pwa-tile-grid", { timeout: 15000 });
        console.log("Selector found, proceeding to scrape");
        return true;
      } catch (e) {
        console.error(`Attempt ${i + 1} failed: ${e.message}`);
        if (i === retries - 1) {
          console.error("Max retries reached. Exiting.");
          await browser.close();
          return false;
        }
      }
    }
  }

  const pageLoaded = await loadPage(page, url);
  if (!pageLoaded) return;

  console.log("Page loaded, scraping the data");

  try {
    const jobdata = await page.evaluate(() => {
      try {
        const items = document.querySelectorAll(
          ".c-pwa-tile-grid .c-pwa-tile-grid-inner"
        );
        const list = Array.from(items).map((item) => {
          const name =
            item
              .querySelector(".o-pwa-product-tile__heading")
              ?.innerText.trim() ?? "N/A";
          if (name == "N/A") return;
          const price =
            item
              .querySelector(".c-pwa-product-price__current")
              ?.innerText.trim() ?? "N/A";
          const link = item.querySelector(".c-pwa-link")?.href ?? "N/A";
          const tag =
            item
              .querySelector(".o-pwa-product-visual-badge__text")
              ?.innerText.trim() ?? "N/A";
          const colorInputs = item.querySelectorAll(
            ".c-pwa-form input[type='radio']"
          );
          const colors = Array.from(colorInputs).map((input) => {
            const colorValue = input.value;
            const colorName =
              input.nextElementSibling.querySelector("img")?.alt.trim() ??
              "N/A";
            const colorImage =
              input.nextElementSibling.querySelector("img")?.src.trim() ??
              "N/A";
            return { colorName, colorImage };
          });

          const imageTags = item.querySelectorAll("img");
          const images = Array.from(imageTags)
            .map((img) => img.src)
            .join(", ");

          return { name, price, link, tag, images, colors };
        });
        return { list };
      } catch (err) {
        return { error: err.message };
      }
    });

    if (jobdata.error) {
      throw new Error(jobdata.error);
    }

    console.log("Data fetched, saving");

    const csvData = jobdata.list.map((item) => {
      const formattedColors = item?.colors
        .map((color) => `${color.colorName}: ${color.colorImage}`)
        .join(", ");

      return {
        name: item.name,
        price: item.price,
        link: item.link,
        tag: item.tag,
        images: item.images,
        colors: formattedColors,
      };
    });

    const csvWriter = createCsvWriter({
      path: "job.csv",
      header: [
        { id: "name", title: "Name" },
        { id: "price", title: "Price" },
        { id: "link", title: "Link" },
        { id: "tag", title: "Tag" },
        { id: "images", title: "Images" },
        { id: "colors", title: "Colors" },
      ],
    });

    await csvWriter.writeRecords(csvData);
    console.log("Data saved to job.csv");
  } catch (e) {
    console.error("Error scraping the data:", e);
  }

  console.log("Closing the browser");
  await browser.close();

  console.log("Scraping done");
  return;
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

module.exports = { main };
