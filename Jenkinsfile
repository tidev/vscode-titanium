#! groovy
@Library('pipeline-library')
import com.axway.AppcCLI;

def appc = new AppcCLI(steps)
timestamps {
  def nodeVersion = '12.18.0'
  def npmVersion = 'latest'
  def sdkVersion = '9.0.3.GA'

  node('osx') {
    stage('Checkout') {
      checkout([
        $class: 'GitSCM',
        branches: scm.branches,
        extensions: scm.extensions + [[$class: 'CleanBeforeCheckout']],
        userRemoteConfigs: scm.userRemoteConfigs
      ])
    }

    nodejs(nodeJSInstallationName: "node ${nodeVersion}") {
      ansiColor('xterm') {
        stage('Install') {
          timeout(15) {
            // Ensure we have npm
            ensureNPM(npmVersion)
            sh 'npm ci'
          } // timeout
        } // stage install

        stage('Lint') {
          sh 'npm run lint'
        } // stage lint

        stage('Unit Test') {
          try {
            sh 'npm run test'
          } finally {
            junit 'junit_report.xml'
            if (fileExists('coverage/cobertura-coverage.xml')) {
              step([$class: 'CoberturaPublisher', autoUpdateHealth: false, autoUpdateStability: false, coberturaReportFile: 'coverage/cobertura-coverage.xml', failUnhealthy: false, failUnstable: false, maxNumberOfBuilds: 0, onlyStable: false, sourceEncoding: 'ASCII', zoomCoverageChart: false])
            } else {
              def coverageContents = sh(returnStdout: true, script: 'ls coverage/').trim()
              def warningMessage = "Failed to collect coverage, coverage folder contents was ${coverageContents}"
              echo warningMessage
              manager.addWarningBadge(warningMessage)
            }
          }
        } // stage unit test

        stage('Integration Test') {
          appc.install()
          appc.installAndSelectSDK(sdkVersion)
          appc.loggedIn {
            // Run ui/e2e tests
            try {
              sh './runUITests.sh'
            } finally {
              sh 'ls'
              junit 'junit_report-ui.xml'
            }
          }
        } // stage integration

        stage('Build vsix') {
          // Create the vsix package
          sh 'npx vsce package'
          // Archive it
          archiveArtifacts '*.vsix'
        }

        stage('Danger') {
          withEnv(["BUILD_STATUS=${currentBuild.currentResult}","DANGER_JS_APP_INSTALL_ID=''"]) {
            sh returnStatus: true, script: 'npx danger ci --verbose' // Don't fail build if danger fails. We want to retain existing build status.
          } // withEnv
        }
      } // ansiColor
    } // nodejs
  } // node
} // timestamps
