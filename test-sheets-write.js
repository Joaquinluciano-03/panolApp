const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

async function test() {
  const email = "panolapp@sistema-panol-496022.iam.gserviceaccount.com";
  let key = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDiNrcrRvemAiQl\nJFDp+DnKcEoSbd0CfI+0yjLflKxIpa6dCSIwBNl9aAFO1BL/icEuO/p3Bgd/Shw5\nJtpkl645we6qQ9MywJA/k6/wKsZl4FNkhRvhlaBIN20d6L79VI2/cAEuom8qatf3\n6FwRQZzcV5INlbYmFd5MagKJ16lbHXIWLFO357yYyCt7BHzkHERyzbt7DfNWQb08\nCYPQoYeNqokkbngx/wmRgVGmpIk8ZsKKL4Bl1lQWGhNHp1wZQdVB+mPP8OaR8e+2\npCgRVIojE9MtPmf9rzw5EtCgQMP0wwxuk/UNTNB5IFEz38RU7ciEoS4r5Goi8/B4\nf1nUt/r9AgMBAAECggEAWesa6yJ1/TB7sqHZYe9P9XamEuZFxB/ENb5r83CS/PuS\nyYwgYUsEMrOdVXq6JIZa2ihwOlCUuVW5m0Qk6nhagk3isx5rvJBLpmHrvQEbxNIj\nA+FfQE+sGxihEJL8HBG4mICKj8F0g71dpIbh1eApXHKYtTqt4TyvFNvMr4Mgp/zw\nWAhdhDmFdvnyslL0IIEgCvKvLsyp/ox5KVwmSEU3XJOnqDZiZOM7UYcfTlxryKur\nphXpP3uKFQTr2Q/6FYumWbBrfOV1y1mcQk3V3ZldLgPHOnlHvmJORoPBeyjrDTb4\n358U7+Gdj6sCNoCK2QNFja2ipZF0eUgfjxCIM2mA5wKBgQD87gJ3Uy24Dwmp9ZOs\naPXnAOWs5Tw9zyKVPQPGoYe8dOj/WALMBCzyDmVuI1GNtVIaX/71G1/k3Tax5PzR\nxYCCSvQmOFDcIs5oGofucvS1p/EdxL9gNV7EYLwgdZyoMMiILJYvRlj8IqaPunb6\nzUu9RdXzDdEmu7uwo7PUAvZmNwKBgQDk9a9K1sd5Wjio2zg8S1GtZvO0pypbLjs1\n36a/yfht3UwT9WOkj3JJJqlRC66q6lMel9qsAtmYBgw/YQbat57VBJaGVsWeGjgY\nwaTQkWU7bjfjc0+RhZ4XMBRL6WKpvGHMWSTxU3+niI28QEWyPTdinQJO9hP9di4z\n5joyjN3OawKBgAwoLHorx1DHeEFxCk4JJXia9G8g/YpDAHiH3DyZ2vpV7DUJt+iy\ncq6XvoxSqkLTakTWRFznme5YK57VUMmMYqbgj2ee4VQTYDRkwg/V+qkYj2BM6p3n\nMszhkWlF/eefoKPa8MUI7pH/4F2cKsfXQkKwrp3mFh10fIr681PHaKx1AoGBAKKI\nUd6jp0jbJhugO0R6B0o8KkaU4HmH0RqGYL4HJyb+kHIeoZSBDBUnr8xLqbvEyiqO\ni/nNsB++M1WOkCoVbVg0gJJu6Kw6WpYgaNpyTFWrAVuiUNqx6q71P4M/8v0hMJ+6\nrIHvz0/jnRIE4jUMRdPoN2pMP5aPHW9UQP3/h7lvAoGBAKH/Me5Pua+5G+7+npGF\nTs7PVrvl7MYjB0V5o8Y/WNsi0CzqqSiF2zDehr4dXE4TMcpotRzkva+SFyxd5reK\nh6L81NEz7k3El7gYSB50BUmwvvLeRxI9/6dVNhKXmAc2Gc0y8eUzbGlPMCcRZJ/i\nCqhE3HBKbLFbc2QB8zZMmBie\n-----END PRIVATE KEY-----\n";

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key,
    },
    scopes: SCOPES,
  });

  const sheets = google.sheets({ version: 'v4', auth });
  
  try {
    const res = await sheets.spreadsheets.values.append({
      spreadsheetId: '1vWI4YNOerTUeGYjtTAuRkX6vwHBzki7A1xi7oYUT4U0',
      range: 'A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['TEST']] },
    });
    console.log("WRITE SUCCESS");
  } catch (err) {
    console.error("WRITE ERROR:", err.message);
  }
}

test();
