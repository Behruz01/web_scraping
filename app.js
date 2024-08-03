const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const url = "https://writing9.com/ielts-writing-samples";

const scrapeData = async (url) => {
  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    let data = [];

    const links = [];

    $("div.jsx-2134295183.question-wrap a").each((index, element) => {
      const href = $(element).attr("href");
      const linkUrl = new URL(href, url).href;
      links.push(linkUrl);
    });

    const scoresText = $("div.jsx-2134295183.band").text();

    // Skorlarni band formatida ajratish va bo'sh joy qo'shish
    const scores = scoresText
      .match(/\d+(\.\d+)?band/g)
      .map((score) => score.replace("band", " band"));

    // Fetch all linked pages concurrently
    const linkData = await Promise.all(
      links.map(async (linkUrl, index) => {
        const linkedResponse = await axios.get(linkUrl);
        const linkedHtml = linkedResponse.data;
        const $linked = cheerio.load(linkedHtml);

        const essay = $linked("div.jsx-319668748")
          .text()
          .replace(/\n+/g, " ")
          .replace(/\s\s+/g, " ");

        const scoresArray = [];
        $linked("h3.jsx-2802957637.page-draft-text-analyzer__section").each(
          (index, element) => {
            const scoreText = $(element).text().trim();
            scoresArray.push({ item: scoreText });
          }
        );

        const feedbacksArray = [];
        $linked("div.advice-item__text").each((index, element) => {
          const feedback = $(element).text().trim();
          feedbacksArray.push({ text: feedback });
        });

        return {
          overall_band_score: parseFloat(scores[index]),
          essay: essay,
          scores: scoresArray,
          feedbacks: feedbacksArray,
        };
      })
    );

    data = linkData;

    return data;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
};

const main = async () => {
  const data = await scrapeData(url);
  if (data) {
    fs.writeFileSync("output.json", JSON.stringify(data, null, 2), "utf-8");
    console.log("Data has been written to output.json");
  }
};

main();
