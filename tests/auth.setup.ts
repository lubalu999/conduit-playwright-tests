import { test as setup } from "@playwright/test";
import user from "../.auth/user.json";
import fs from "fs";

const authFile = ".auth/user.json";

setup("authentication", async ({ page, request }) => {
    // log in
    const response = await request.post("https://conduit-api.bondaracademy.com/api/users/login", {
        data: {
            user: { email: "liza@test.com", password: "123456" },
        },
    });

    const responseBody = await response.json();
    // get access token
    const accessToken = responseBody.user.token;

    // assign accessToken to user in .json file
    user.origins[0].localStorage[0].value = accessToken;
    // rewrite user.json file with actual token
    fs.writeFileSync(authFile, JSON.stringify(user));

    // assign accessToken to process environment
    process.env["ACCESS_TOKEN"] = accessToken;
});
