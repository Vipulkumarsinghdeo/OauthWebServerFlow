// Add this at the very top with your other constants
const instance_url = "https://resilient-goat-ocpsv1-dev-ed.trailblaze.my.salesforce.com/";
const client_id = "3MVG94Jqh209Cp4TuYid7kWOFlj2Gwu65e7URo_jxtsirlfGJQxN2r6EBW1Qw249JZXK_zt8fMEiM7LZoj6ap";
const client_secret = "2598AE7877A3196E1E7924D4D95E46CEE98356E89497876C11002E7456A29953"; // <--- ADD THIS
const redirect_uri = "http://localhost:5500/index.html"; 
const access_token_path = "services/oauth2/token";

// ... existing handleButtonClick and onload code ...

async function fetchAccessTokenPKCE(authCode) {
    const tokenUrl = instance_url + access_token_path;
    const codeVerifier = sessionStorage.getItem("pkce_verifier");
    
    if (!codeVerifier) {
        console.error("No verifier found! Redirecting to restart...");
        handleButtonClick();
        return;
    }

    // Now client_secret will be defined and work here
    const data = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: client_id,
        client_secret: client_secret, 
        code: authCode,
        redirect_uri: redirect_uri,
        code_verifier: codeVerifier
    });

    try {
        const response = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: data,
        });

        const result = await response.json();

        if (result.access_token) {
            document.getElementById("token").innerText = result.access_token;
            sessionStorage.removeItem("pkce_verifier");
            window.history.replaceState({}, document.title, "/index.html");
        } else {
            console.error("Token Error:", result);
            alert("Failed: " + (result.error_description || "Unknown error"));
        }
    } catch (error) {
        console.error("Error fetching access token:", error);
    }
}

async function handleButtonClick() {
    try {
        const { codeVerifier, codeChallenge } = await generatePKCECodes();
        sessionStorage.setItem("pkce_verifier", codeVerifier);

        // Standard Authorization URL construction
        let authUrl = `${instance_url}services/oauth2/authorize?` + 
                      `response_type=code` +
                      `&client_id=${client_id}` +
                      `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
                      `&code_challenge=${codeChallenge}` +
                      `&code_challenge_method=S256`; +
                      `&immediate=false`; // <--- ADD THIS PARAMETER

        // NOTE: If you experience 'immediate_unsuccessful' errors while logged in,
        // you may need to remove any '&scope=...' parameters from your URL 
        // if they were previously included.

        location.href = authUrl;
    } catch (error) {
        console.error("Error initiating PKCE flow:", error);
    }
}

window.onload = function () {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get("code");
    const error = urlParams.get("error"); // Capture any redirect errors
    const accessTokenDisplayed = document.getElementById("token").innerText;
    
    if (authCode) {
        console.log("AuthCode found, exchanging for token...");
        fetchAccessTokenPKCE(authCode);
    } 
    // Handle the silent failure case
    else if (error === "immediate_unsuccessful") {
        console.warn("Silent login failed. User must log in manually.");
        // OPTIONAL: Provide a manual login button or try again with immediate=false
    }
    else if (!accessTokenDisplayed) {
        console.log("Attempting silent Salesforce login redirect...");
        handleButtonClick(); 
    }
};

async function fetchAccessTokenPKCE(authCode) {
    const tokenUrl = instance_url + access_token_path;
    const codeVerifier = sessionStorage.getItem("pkce_verifier");
    
    // Check if we have the verifier
    if (!codeVerifier) {
        console.error("No verifier found! Restarting login...");
        handleButtonClick();
        return;
    }

    const data = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: client_id,
        client_secret: client_secret, // ADD THIS LINE BACK
        code: authCode,
        redirect_uri: redirect_uri,
        code_verifier: codeVerifier
    });

    try {
        const response = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: data,
        });

        const result = await response.json();

        if (result.access_token) {
            document.getElementById("token").innerText = result.access_token;
            sessionStorage.removeItem("pkce_verifier");
            // Clean the URL bar
            window.history.replaceState({}, document.title, "/index.html");
            alert("Login successful!");
        } else {
            console.error("Token Error:", result);
            alert("Failed: " + (result.error_description || "Unknown error"));
        }
    } catch (error) {
        console.error("Error fetching access token:", error);
    }
}
// Improved PKCE Generator
async function generatePKCECodes() {
    const encoder = new TextEncoder();
    const randomValues = crypto.getRandomValues(new Uint8Array(32));
    
    // Create Verifier
    const verifier = btoa(String.fromCharCode(...randomValues))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Create Challenge
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(verifier));
    const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        
    return { codeVerifier: verifier, codeChallenge: challenge };
}
