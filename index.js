const axios = require('axios').default;
const notifier = require('node-notifier');
const CronJob = require('cron').CronJob;

const state = {
  confirmed: 0,
  deaths: 0,
  recovered: 0,
};

function notify(message) {
  console.log(`Notify: ${message}`);

  notifier.notify(
    {
      title: 'Covid-19',
      message,
      // icon: path.join(__dirname, 'image.jpg'), // Absolute path (doesn't work on balloons)
      sound: true, // Only Notification Center or Windows Toasters
      wait: true // Wait with callback, until user action is taken against notification, does not apply to Windows Toasters as they always wait
    },
    function(err, response) {
      // Response is response from notification
    }
  );
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getNumber(value) {
  const pattern = /(?<=\>)[\d.,\s]+(?=<\/span)/;
  const [ result ] = value.match(pattern);
  const numberRaw = result.split('').filter(item => '0123456789.,'.includes(item)).join('').replace(/,/g, '');
  return toNumber(numberRaw);
}

async function getNumbers() {
  try {
    const url = 'https://www.worldometers.info/coronavirus/';
    const result = await axios.get(url);
  
    let data = result.data.replace(/\n/g, '');
    const pattern = 'class="maincounter-number"'; 
    const amount = 100;
  
    let index = data.indexOf(pattern);
    const confirmed = getNumber(data.substr(index, amount));
    data = data.substr(index + pattern.length);
  
    index = data.indexOf(pattern);
    const deaths = getNumber(data.substr(index, amount));
    data = data.substr(index + pattern.length);
  
    index = data.indexOf(pattern);
    const recovered = getNumber(data.substr(index, amount));
  
    return { confirmed, deaths, recovered };
  } catch (e) {
    notify('Error');
    console.log(e);
    return { confirmed: 0, deaths: 0, recovered: 0 };
  }
}

function toNumber(numRaw) {
  return +numRaw;
}

async function updateValues() {
  console.log('Updated ' + Date.now());

  const { confirmed, deaths, recovered } = await getNumbers();
  
  const changed = (confirmed !== state.confirmed) || (deaths !== state.deaths) || (recovered !== state.recovered);
  if (changed) {
    const confirmedMessage = `Confirmed: ${numberWithCommas(confirmed)}. + ${numberWithCommas(confirmed - state.confirmed)}`;
    const deathsMessage = `Deaths: ${numberWithCommas(deaths)}. + ${numberWithCommas(deaths - state.deaths)}`;
    const recoveredMessage = `Recovered: ${numberWithCommas(recovered)}. + ${numberWithCommas(recovered - state.recovered)}`;

    notify(`${confirmedMessage}\n${deathsMessage}\n${recoveredMessage}`);

    state.confirmed = confirmed;
    state.deaths = deaths;
    state.recovered = recovered;
  }
}

async function main() {
  const { confirmed, deaths, recovered } = await getNumbers();

  state.confirmed = confirmed;
  state.deaths = deaths;
  state.recovered = recovered;

  notify(`Confirmed: ${numberWithCommas(confirmed)}\nDeaths: ${numberWithCommas(deaths)}\nRecovered: ${numberWithCommas(recovered)}`);

  const job = new CronJob('0 0 * * * *', updateValues); // Every hour at minute 0 second 0
  job.start();
}

main();
