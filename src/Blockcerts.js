import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Certificate, CertificateVerifier } from 'cert-verifier-js';
import Timestamp from 'react-timestamp';
import ReactJson from 'react-json-view';

import { withStyles } from '@material-ui/core/styles';
import { Button, Paper, Stepper, Step, StepLabel, StepContent, Tabs, Tab, Typography } from '@material-ui/core';

const styles = {
  wrapper: {
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 'auto',
    marginRight: 'auto',
    maxWidth: 992,
  },
  header: {
    color: 'white',
    paddingTop: 20,
    textAlign: 'center',
  },
  tab: {
    padding: 20,
  },
  tabs: {
    marginTop: 10,
  },
  image: {
    maxWidth: '100%',
    height: 'auto',
    marginBottom: 20,
  },
  stepper: {
    textAlign: 'left',
  },
  stepButtons: {
    marginTop: 20,
  },
  stepButton: {
    marginRight: 20,
  },
  verifierResult: {
    textAlign: 'center',
  },
  verifierButton: {
    margin: 20,
  },
  jsonContainer: {
    textAlign: 'left',
    fontSize: '10px',
    overflow: 'hidden',
  },
};

function TabContainer(props) {
  return (
    <Typography component="div" style={{ padding: 8 * 3 }}>
      {props.children}
    </Typography>
  );
}

TabContainer.propTypes = {
  children: PropTypes.node.isRequired,
};

const verifierSteps = [
  {
    status: 'computingLocalHash',
    name: 'Computing local hash',
    description: 'Compute locally the hash of this certificate.',
  },
  {
    status: 'fetchingRemoteHash',
    name: 'Fetching remote hash',
    description: 'Get the certificate hash stored in the blockchain transaction.',
  },
  {
    status: 'parsingIssuerKeys',
    name: 'Parsing issuer keys',
    description: 'Get the issuer blockchain public keys (actual and revoked).',
  },
  {
    status: 'comparingHashes',
    name: 'Comparing hashes',
    description: 'Compare the locally computed hash of this certificate VS the hash stored in the blockchain.',
  },
  {
    status: 'checkingMerkleRoot',
    name: 'Checking Merkle root',
    description: 'Validate the Merkle proof stored inside of the certificate.',
  },
  {
    status: 'checkingReceipt',
    name: 'Checking receipt',
    description: 'Compare the Merkle root value in the certificate with the value in the blockchain transaction.',
  },
  {
    status: 'checkingRevokedStatus',
    name: 'Checking revoked status',
    description: 'Check that this certificate has not been revoked by the issuer.',
  },
  {
    status: 'checkingAuthenticity',
    name: 'Checking authenticity',
    description: 'Check that the certificate was authored by the issuer.',
  },
  {
    status: 'checkingExpiresDate',
    name: 'Checking expires date',
    description: 'Check that the certificate is not expired.',
  },
  {
    status: 'success',
    name: 'Valid certificate',
    description: 'Success: this certificate is valid!',
  },
];

class Blockcerts extends Component {
  constructor (props) {
    super (props);
    this.state = {
      tab: 0,
      certificateJson: null,
      certificate: null,
      verifierStep: 0,
      verifierFailureStep: null,
      verifierResult: null,
      viewJson: false
    }
    this.tabChange = this.tabChange.bind(this);
    this.verifyCertificate = this.verifyCertificate.bind(this);
    this.verifierStepper = this.verifierStepper.bind(this);
    this.verifierNext = this.verifierNext.bind(this);
    this.verifierBack = this.verifierBack.bind(this);
  }
  async componentDidMount() {
    // Fetch certificate.
    try {
      const response = await fetch(this.props.url);
      const certificateJson = await response.json();
      this.setState({certificateJson: certificateJson});
    }
    catch (error) {
      console.error(error);
    }
    let certificate = Certificate.parseJson(this.state.certificateJson);
    this.setState({certificate: certificate});
    this.verifyCertificate();
  }
  tabChange(event, value) {
    this.setState({tab: value});
  }
  verifyCertificate() {
    if (this.state.certificateJson) {
      let verifier = new CertificateVerifier(
        JSON.stringify(this.state.certificateJson),
        this.verifierStepper
      );
      verifier
      .verify()
      .then(result => this.setState({verifierResult: result}))
      .catch(e => console.error(e));
    }
  }
  verifierStepper(status) {
    if (status !== 'failure') {
      let step = Object.keys(verifierSteps).find(key => verifierSteps[key].status === status);
      this.setState({verifierStep: step});
    }
    else {
      this.setState({
        verifierFailureStep: this.state.verifierStep,
        verifierResult: 'failure'
      });
    }
  }
  verifierNext() {
    this.setState({verifierStep: this.state.verifierStep + 1});
  }
  verifierBack() {
    this.setState({verifierStep: this.state.verifierStep - 1});
  }
  toggleDebug() {
    if (this.state.viewJson) {
      this.setState({viewJson: false});
    }
    else {
      this.setState({viewJson: true});
      console.log(this.state.certificateJson);
    }
  }
  render() {
    if (this.state.certificateJson && this.state.certificate) {
      const { tab } = this.state;
      const { verifierStep } = this.state;
      const { verifierFailureStep } = this.state;
      return (
        <div className={this.props.classes.wrapper}>
          <Paper elevation={4}>
            <div className={this.props.classes.header} style={{backgroundColor : this.props.color_bg}}>
              <img src={this.props.image} />
              <Tabs
                className={this.props.classes.tabs}
                value={tab}
                onChange={this.tabChange}
                indicatorColor='primary'
                centered
              >
                <Tab label='View' />
                <Tab label='Verify' />
              </Tabs>
            </div>
            {tab === 0 && <TabContainer>
              <div className={this.props.classes.tab}>
                {this.state.certificateJson.displayHtml && <div dangerouslySetInnerHTML={{__html: this.state.certificateJson.displayHtml.replace(/(<? *script)/gi, 'illegalscript')}} >
                </div>}
                {!this.state.certificateJson.displayHtml && <div>
                  <img src={this.state.certificate.certificateImage} className={this.props.classes.image} />
                  <Typography paragraph variant="headline" component="h1">
                    {this.state.certificate.title}
                  </Typography>
                  <Typography paragraph variant="subheading" component="h2">
                    {this.state.certificate.subtitle}
                  </Typography>
                  <Typography paragraph variant="caption" component="p">
                    Awarded on <Timestamp time={this.state.certificateJson.issuedOn.toString()} format="full" /> to
                  </Typography>
                  <Typography paragraph variant="title" component="h2">
                    {this.state.certificate.name}
                  </Typography>
                  <Typography paragraph component="p">
                    {this.state.certificate.description}
                  </Typography>
                  <Typography paragraph variant="caption" component="p">
                    Issued by
                  </Typography>
                  <img src={this.state.certificate.sealImage} className={this.props.classes.image} />
                  <Typography paragraph variant="title" component="h2">
                    {this.state.certificate.issuer.name}
                  </Typography>
                  <Typography paragraph component="p">
                    {this.state.certificate.issuer.description}
                  </Typography>
                  <Typography paragraph component="p">
                    {this.state.certificate.issuer.email}
                  </Typography>
                </div>}
              </div>
            </TabContainer>}
            {tab === 1 && <TabContainer>
              <div className={this.props.classes.verifierResult}>
                <Typography variant="headline" component="h3">
                  {this.state.verifierResult === 'success' ? 'Valid certificate': 'Invalid certificate'}
                </Typography>
                <Typography component="p">
                  {this.state.verifierResult === 'success' ? 'All the verification steps succedded. This certificate is valid!': 'Some verification steps did not succeed. This certificate is NOT valid.'}
                </Typography>
                <Button className={this.props.classes.verifierButton} variant="contained" color="primary" onClick={this.verifyCertificate}>
                  Verify
                </Button>
                <Button className={this.props.classes.verifierButton} variant="contained" color="primary" href={this.state.certificate.transactionLink}>
                  See blockchain transaction
                </Button>
                <Button
                  className={this.props.classes.verifierButton}
                  variant="contained"
                  onClick={this.toggleDebug.bind(this)}>
                  Raw data
                </Button>
              </div>
              {this.state.viewJson && <div className={this.props.classes.jsonContainer}>
                <Typography paragraph component="p">
                  Data is logged in the browser console, too.
                </Typography>
                <ReactJson
                  src={this.state.certificateJson}
                  collapsed={true}
                />
              </div>}
              <div className={this.props.classes.stepper}>
                <Stepper
                  activeStep={parseInt(verifierStep)}
                  orientation="vertical">
                  {verifierSteps.map((step, index) => {
                    return (
                      <Step key={index}>
                        <StepLabel>{step.name}</StepLabel>
                        <StepContent>
                          <Typography>{step.description}</Typography>
                          <div className={this.props.classes.stepButtons}>
                            {verifierStep > 0 && <Button
                              size="small"
                              color="secondary"
                              className={this.props.classes.stepButton}
                              onClick={this.verifierBack}
                            >
                              Back
                            </Button>}
                            {(verifierStep < verifierSteps.length - 1 && (!verifierFailureStep || verifierStep < verifierFailureStep)) && <Button
                              size="small"
                              color="secondary"
                              className={this.props.classes.stepButton}
                              onClick={this.verifierNext}
                            >
                              Next
                            </Button>}
                          </div>
                        </StepContent>
                      </Step>
                    );
                  })}
                </Stepper>
              </div>
            </TabContainer>}
        </Paper>
        </div>
      );
    }
    else {
      return(null);
    }
  }
}

Blockcerts.defaultProps = {
  color_bg: '#02112a',
  image: 'data:image/png;base64,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',
 };

Blockcerts.propTypes = {
  url: PropTypes.string.isRequired,
  image: PropTypes.string.isRequired,
  color_bg: PropTypes.string.isRequired
}

export default withStyles(styles)(Blockcerts);
