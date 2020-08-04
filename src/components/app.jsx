import React, { useState, useEffect } from 'react';
import moment from 'moment';

import Airtable from 'airtable';
const base = new Airtable({ apiKey: 'keyCxnlep0bgotSrX' }).base('appHXXoVD1tn9QATh');

import Header from './header';
import Footer from './footer';
import Modal from './modal';
import Tile from './tile';

import dynamicSort from '../helpers/dynamicSort';

function clientsReducer(state, action) {
  return [...state, ...action];
}

/* globals $ */
function App() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [activities, setActivities] = useState([]);
  const [pdfUrl, setPdfUrl] = useState('');

  const [clients, dispatch] = React.useReducer(
    clientsReducer,
    [] // initial clients
  );

  // When app first mounts, fetch clients
  useEffect(() => {

    base('Clients').select({
      view: 'sorted'
    }).eachPage((records, fetchNextPage) => {
      dispatch(records);

      fetchNextPage();
    }, (err) => {
      if (err) {
        console.error(err);
        return;
      }
    });

  }, []); // Pass empty array to only run once on mount

  function getAllActivities() {
    if (selectedClient) {
      if (selectedClient.fields['LimeadeAccessToken']) {

        console.log('Getting all activities (past, current, and scheduled) for ' + selectedClient.fields['Account Name']);
        $('#spinner').show();

        $.ajax({
          url: 'https://api.limeade.com/api/admin/activity',
          type: 'GET',
          dataType: 'json',
          headers: {
            Authorization: 'Bearer ' + selectedClient.fields['LimeadeAccessToken']
          },
          contentType: 'application/json; charset=utf-8'
        }).done((result) => {
          $('#spinner').hide();
          const activities = result.Data;

          setActivities(activities);

        }).fail((xhr, textStatus, error) => {
          console.error(`${selectedClient.fields['Account Name']} - GET ActivityLifecycle has failed`);
        });

      } else {
        console.error(`${selectedClient.fields['Account Name']} has no LimeadeAccessToken`);
      }
    } else {
      console.log('No client has been selected');
    }
  }

  function selectClient(e) {
    clients.forEach((client) => {
      if (client.fields['Limeade e='] === e.target.value) {
        setSelectedClient(client);
      }
    });
  }

  function renderEmployerNames() {
    return clients.map((client) => {
      return <option key={client.id}>{client.fields['Limeade e=']}</option>;
    });
  }

  function renderActivities() {
    console.log(activities);

    // Filter out CIEs and past activities
    const filteredActivities = activities.filter(activity => {

      // Put filter logic in here
      let includesPdfUrl;
      const isNotCompleted = activity.Status !== 'Completed';

      if (activity.ShortDescription) {
        includesPdfUrl = activity.ShortDescription.includes(pdfUrl) || activity.AboutChallenge.includes(pdfUrl);
      } else {
        includesPdfUrl = activity.AboutChallenge.includes(pdfUrl);
      }

      return isNotCompleted && includesPdfUrl;

    });

    // filteredActivities.sort(dynamicSort('ChallengeId'));

    return filteredActivities.map((activity, i) => {
      return (
        <tr key={i}>
          <td>{activity.Name}</td>
          <td>{activity.ChallengeId > 0 ? activity.ChallengeId : 'CIE ' + (activity.ChallengeId * -1)}</td>
          <td>{moment(activity.StartDate).format('ll')}</td>
          <td>{moment(activity.EndDate).format('ll')}</td>
          <td>{activity.Status}</td>
        </tr>
      );
    });
  }

  function handleChangePdfUrl(e) {
    setPdfUrl(e.target.value);
  }

  return (
    <div id="app">
      <Header />

      <div className="form-group">
        <label htmlFor="employerName">EmployerName</label>
        <select id="employerName" className="form-control custom-select" onChange={(e) => selectClient(e)}>
          <option defaultValue>Select Employer</option>
          {renderEmployerNames()}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="pdfUrl">PDF Url</label>
        <input type="text" className="form-control" id="pdfUrl" placeholder="https://..." value={pdfUrl} onChange={handleChangePdfUrl} />
        <small id="pdfUrlHelp" className="form-text text-muted">Copy the whole url with the "https://"</small>
      </div>

      <div className="form-group">
        <button type="button" className="btn btn-primary" onClick={getAllActivities}>Search Tiles</button>
      </div>

      <img id="spinner" src="images/spinner.svg" />

      <table className="table table-hover table-striped" id="activities">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">ChallengeId</th>
            <th scope="col">StartDate</th>
            <th scope="col">EndDate</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {renderActivities()}
        </tbody>
      </table>

      <Footer />

    </div>
  );
}

export default App;
