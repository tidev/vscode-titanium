#! groovy
@Library('pipeline-library')
import com.axway.AppcCLI;

def integrationTest(nodeVersion, npmVersion, sdkVersion, appc) {
  return {
    node('vncserver') {
      unstash 'sources'
      nodejs(nodeJSInstallationName: "node ${nodeVersion}") {
        ensureNPM(npmVersion)
        sh 'npm ci'
        appc.install()
        appc.installAndSelectSDK(sdkVersion)
        wrap([$class: 'Xvnc', takeScreenshot: false, useXauthority: true]) {
          appc.loggedIn {
            // Run ui/e2e tests
            try {
              sh './runUITests.sh'
            } finally {
              junit 'junit_report-ui.xml'
              stash includes: 'junit_report-ui.xml', name: 'integration-tests'
            }
          } // appc.loggedin
        } // xvnc
      } // nodejs
    } // node
  }
}

def unitTest(nodeVersion, npmVersion) {
  return {
    node('linux && !master') {
      unstash 'sources'
      nodejs(nodeJSInstallationName: "node ${nodeVersion}") {
        ensureNPM(npmVersion)
        sh 'npm ci'
        try {
          sh 'npm run test'
        } finally {
          junit 'junit_report.xml'
          stash includes: 'junit_report.xml', name: 'unit-tests'
          if (fileExists('coverage/cobertura-coverage.xml')) {
            step([$class: 'CoberturaPublisher', autoUpdateHealth: false, autoUpdateStability: false, coberturaReportFile: 'coverage/cobertura-coverage.xml', failUnhealthy: false, failUnstable: false, maxNumberOfBuilds: 0, onlyStable: false, sourceEncoding: 'ASCII', zoomCoverageChart: false])
          } else {
            def coverageContents = sh(returnStdout: true, script: 'ls coverage/').trim()
            def warningMessage = "Failed to collect coverage, coverage folder contents was ${coverageContents}"
            echo warningMessage
            manager.addWarningBadge(warningMessage)
          }
        }
      } // nodejs
    } // node
  }
}

timestamps {
  def appc = new AppcCLI(steps)
  def nodeVersion = '12.18.0'
  def npmVersion = 'latest'
  def sdkVersion = '9.0.3.GA'

  node('osx') {
    nodejs(nodeJSInstallationName: "node ${nodeVersion}") {
      ansiColor('xterm') {
        try {
          stage('Checkout') {
            checkout([
              $class: 'GitSCM',
              branches: scm.branches,
              extensions: scm.extensions + [[$class: 'CleanBeforeCheckout']],
              userRemoteConfigs: scm.userRemoteConfigs
            ])
            stash 'sources'
          } // stage('Checkout')

          stage('Install') {
            timeout(15) {
              // Ensure we have npm
              ensureNPM(npmVersion)
              sh 'npm ci'
            } // timeout
          } // stage('Install')

          stage('Lint') {
            sh 'npm run lint'
          } // stage('Lint')

          stage('Test') {
            parallel(
              'Integration Test': integrationTest(nodeVersion, npmVersion, sdkVersion, appc),
              'Unit Test': unitTest(nodeVersion, npmVersion)
            )
          }

          stage('Build vsix') {
            // Create the vsix package
            sh 'npx vsce package'
            // Archive it
            archiveArtifacts '*.vsix'
          } // stage('Build vsix')
        } finally {
          stage('Danger') {
            unstash 'unit-tests'
            unstash 'integration-tests'
            withEnv(["BUILD_STATUS=${currentBuild.currentResult}","DANGER_JS_APP_INSTALL_ID=''"]) {
              sh returnStatus: true, script: 'npx danger ci --verbose' // Don't fail build if danger fails. We want to retain existing build status.
            } // withEnv
          } // stage('Danger')
        } // finally
      } // ansiColor
    } // nodejs
  } // node
} // timestamps
