const axios = require('axios');
const fs = require('fs');
const csv = require('csv-parser');
const variables = require('./variables');

/**
 * Makes an HTTP request using axios.
 * @param {string} method - The HTTP method (GET, POST, PUT).
 * @param {string} url - The URL to make the request to.
 * @param {string} token - The Bearer token for authorization.
 * @param {object} [data] - The data to send with the request (for POST and PUT).
 * @returns {Promise<object>} - The response data.
 */
async function makeRequest(method, url, token, data = null) {
  try {
    const options = {
      method,
      url,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      data,
    };

    const response = await axios(options);
    return response.data;
  } catch (error) {
    console.error('Error making request:', error.message);
    throw new Error(`Request failed: ${method} ${url}`);
  }
}

const token = variables.token;

const requestsTemplate = [
  {
    name: 'addUser',
    method: 'POST',
    url: `${variables.url}/auth/admin/realms/${variables.realm}/users`,
    data: {
      'attributes': {
        'locale': 'en',
      },
      'requiredActions': [],
      'emailVerified': false,
      'username': '',
      'email': '',
      'firstName': 'PruebaDEV',
      'lastName': 'PruebaDEV',
      'groups': [],
      'enabled': true,
    },
  },
  {
    name: 'findUser',
    method: 'GET',
    url: `${variables.url}/auth/admin/realms/${variables.realm}/ui-ext/brute-force-user?briefRepresentation=true&first=0&max=11&q=&search=`,
  },
  {
    name: 'getIdGroup',
    method: 'GET',
    url: `${variables.url}/auth/admin/realms/${variables.realm}/groups?first=0&max=11`,
  },
  {
    name: 'putGroup',
    method: 'PUT',
    url: `${variables.url}/auth/admin/realms/${variables.realm}/users/idUser/groups/idGroup`,
  },
  {
    name: 'setPassword',
    method: 'PUT',
    url: `${variables.url}/auth/admin/realms/${variables.realm}/users/idUser/reset-password`,
    data: {
      'temporary': false,
      'type': 'password',
      'value': '1234',
    },
  },
];

/**
 * Executes a series of requests in sequence.
 * @param {string} codUser - The codUser to be included in each request.
 * @returns {Promise<void>}
 */
async function executeRequests(codUser) {
  let idUser;
  let idGroup;
  for (const request of requestsTemplate) {
    const currentRequest = { ...request };
    console.log(`Executing ${currentRequest.name} for codUser ${codUser}...`);
    switch (request.name) {
      case 'addUser':
        currentRequest.data.username = `${codUser}@`;
        currentRequest.data.email = `${codUser}@utp.edu.pe1`;
        break;
      case 'findUser':
        currentRequest.url = `${currentRequest.url}${codUser}`;
        break;
      case 'putGroup':
        currentRequest.url = `${currentRequest.url}`
          .replace('idUser', idUser)
          .replace('idGroup', idGroup);
        break;
      case 'setPassword':
        currentRequest.url = `${currentRequest.url}`.replace('idUser', idUser);
        break;
      default:
        break;
    }
    try {
      const response = await makeRequest(
        currentRequest.method,
        currentRequest.url,
        token,
        currentRequest.data,
      );
      if (currentRequest.name === 'findUser') {
        idUser = response.find(
          (user) => user.username.toLowerCase() === `${codUser.toLowerCase()}@`,
        ).id;
      }
      if (currentRequest.name === 'getIdGroup') {
        idGroup = response.find((group) => group.name === 'UTP Estudiantes').id;
      }
      console.log(`${currentRequest.name} succeeded for codUser ${codUser}...`);
    } catch (error) {
      console.error(`${currentRequest.name} failed for codUser ${codUser}:`, error.message);
      break;
    }
  }
}

async function processCSV() {
  const requests = [];

  fs.createReadStream('users.csv')
    .pipe(csv())
    .on('data', (row) => {
      const codUser = row.codUser;
      requests.push(executeRequests(codUser));
    })
    .on('end', async () => {
      try {
        await Promise.all(requests);
        console.log('CSV file successfully processed.');
      } catch (error) {
        console.error('Error processing CSV file:', error);
      }
    });
}

processCSV();
