#! groovy
library 'pipeline-library'

timestamps {
  def nodeVersion = '8.11.4'
  def npmVersion = 'latest'

  node('osx || linux') {
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
            // Ensure we have yarn
            ensureNPM(npmVersion)
            sh 'npm ci'
          } // timeout
        } // stage install

        stage('Lint and Test') {
          sh 'npm run lint'
          // This is pointless right now, for shame! :D
          sh 'npm run test'
        } // stage lint and test
      } // ansiColor
    } // nodejs
  } // node
} // timestamps
