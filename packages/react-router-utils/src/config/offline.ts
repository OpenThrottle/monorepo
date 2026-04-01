export const getOfflineModeTemplate = (
  siteTitle: string,
) => `<!DOCTYPE html><html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${siteTitle}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&amp;display=swap" rel="stylesheet" type="text/css"/>
</head>
<body style="font-family: Inter; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
  <div>
    <h1>🔌 Offline mode</h1>
    <p>We're currently experiencing issues with our servers. Please try again later.</p>
  </div>
</body>
</html>`;
