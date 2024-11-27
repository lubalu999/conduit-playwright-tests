import { test, expect } from "@playwright/test";
import tags from "../test-data/tags.json";

test.beforeEach(async ({ page }) => {
    // here we can change url to **/api/tags to use any pattern matching this url
    await page.route("https://conduit-api.bondaracademy.com/api/tags", async (route) => {
        await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify(tags),
        });
    });

    await page.goto("https://conduit.bondaracademy.com");
    // log in
    await page.getByText(" Sign in ").click();
    await page.getByRole("textbox", { name: "Email" }).fill("liza@test.com");
    await page.getByRole("textbox", { name: "Password" }).fill("123456");
    await page.getByRole("button").click();
});

test("mocking article throgh api", async ({ page }) => {
    await page.route("**/api/articles?limit=10&offset=0", async (route) => {
        const response = await route.fetch();
        const json = await response.json();

        if (json.articlesCount > 2) {
            json.articles[1].title = "This is a MOCK test title";
            json.articles[1].description = "This is a MOCK test description";
        }

        await route.fulfill({ response, json });
    });

    await expect(page.locator(".navbar-brand")).toHaveText(/conduit/);
    await expect(page.locator('[class="tag-default tag-pill"]').getByText("automation", { exact: true })).toContainText(
        "automation"
    );
    await expect(page.locator(".preview-link h1").nth(1)).toHaveText("This is a MOCK test title");
    await expect(page.locator(".preview-link p").nth(1)).toHaveText("This is a MOCK test description");
});

test("create article through api", async ({ page, request }) => {
    // get access token
    const response = await request.post("https://conduit-api.bondaracademy.com/api/users/login", {
        data: {
            user: { email: "liza@test.com", password: "123456" },
        },
    });

    const responseBody = await response.json();
    const accessToken = responseBody.user.token;

    // create an article using api
    const articleResponse = await request.post("https://conduit-api.bondaracademy.com/api/articles/", {
        data: {
            article: {
                title: "title",
                description: "short description",
                body: "long description",
                tagList: ["test"],
            },
        },
        headers: {
            authorization: `Token ${accessToken}`,
        },
    });

    expect(articleResponse.status()).toBe(201);

    // delete crated article
    await page.getByText(" Global Feed ").click();
    await page.getByText("title", { exact: true }).click();
    await page.getByRole("button", { name: " Delete Article " }).first().click();
    await expect(page.locator(".home-page").locator('text="title"')).toHaveCount(0);
});

test("delete article through api", async ({ page, request }) => {
    // create an article through ui
    await page.locator(".nav-link", { hasText: " New Article " }).click();
    await page.getByRole("textbox", { name: "Article Title" }).fill("Playwright is awesome");
    await page.getByRole("textbox", { name: "What's this article about?" }).fill("Playwright description");
    await page
        .getByRole("textbox", { name: "Write your article (in markdown)" })
        .fill("Learn Playwright to improve your skills");
    await page.getByRole("button", { name: " Publish Article " }).click();

    const responseArticle = await page.waitForResponse("https://conduit-api.bondaracademy.com/api/articles/");
    const responseArticleJSON = await responseArticle.json();
    const slug = responseArticleJSON.article.slug;
    console.log(responseArticleJSON);

    await page.locator(".nav-link", { hasText: " Home " }).click();
    await expect(page.locator(".article-preview h1").nth(0)).toHaveText("Playwright is awesome");

    // get access token
    const responseToken = await request.post("https://conduit-api.bondaracademy.com/api/users/login", {
        data: {
            user: { email: "liza@test.com", password: "123456" },
        },
    });

    const responseBody = await responseToken.json();
    const accessToken = responseBody.user.token;

    // delete created article
    const responseDeleting = await request.delete(`https://conduit-api.bondaracademy.com/api/articles/${slug}`, {
        headers: {
            Authorization: `Token ${accessToken}`,
        },
    });

    await page.locator(".nav-link", { hasText: " Home " }).click({ timeout: 2000 });

    expect(responseDeleting.status()).toEqual(204);
});
