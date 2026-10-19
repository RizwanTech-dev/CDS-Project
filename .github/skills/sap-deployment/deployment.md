# SAP Deployment Guide

## 1. Project analysis: current project findings

This repository is a CAP-based SAP project that includes a Java backend, HDI/HANA database deployment, an HTML5 UI app, and BTP Cloud Foundry resources managed through an MTA (`mta.yaml`). The setup is a good example of a CAP/CDS deployment, but it is not a universal SAP UI5 deployment template.

### Detected project structure
- Root project files:
  - `mta.yaml` — main deployment descriptor for MTA modules and resources
  - `package.json` — root Node.js scripts; includes build and deploy commands
  - `xs-security.json` — XSUAA security profile
  - `pom.xml` — parent Maven build for CAP Java project
  - `requests.http` — API testing examples
- CAP backend:
  - `srv/` — Java service module and application configuration
  - `srv/pom.xml` — Java runtime and CDS dependencies
  - `srv/src/main/resources/application.yaml` — Spring Boot configuration for default/local and cloud profiles
- Database layer:
  - `db/` — HDI deployer package and HANA build scripts
  - `db/package.json` — HDB deploy command set
  - `.cdsrc.json` — indicates target database is `hana`
- Frontend UI app:
  - `app/authors/` — UI5/Fiori app module
  - `app/authors/package.json` — UI5 build commands
  - `app/authors/ui5.yaml` and `ui5-deploy.yaml` — UI5 build and deployment configuration
  - `app/authors/xs-app.json` — application router routes for frontend, backend, and repo service
  - `app/authors/webapp/manifest.json` — UI5 app metadata and OData service binding

### Actual discovered deployment configuration

#### MTA module and resource graph
`mta.yaml` defines these MTA modules:
- `capProject-srv` — Java module, type `java`, path `srv`
  - Requires `capProject-db` and `uaa_capProject`
  - Exposes `srv-api` via `${default-url}`
  - Uses SAP Java Buildpack with JRE 21
  - `build-result`: `target/*-exec.jar`
- `capProject-db-deployer` — HDB deployer module, path `db`
  - Requires `capProject-db`
  - Node-based build + HDI deploy step
- `capProject-app-content` — application content module for HTML5 repo packaging
  - Requires `capProject-repo-host` with `content-target: true`
- `comcapprojectauthors` — HTML5 app module for `app/authors`
  - Custom build with `npm install` and `npm run build:cf`
- `capProject-destination-content` — content module for destination configuration
  - Requires `capProject-destination-service` and `capProject-repo-host`
  - Injects service keys for repo host and XSUAA to configure destinations

`mta.yaml` also creates these resources:
- `capProject-db` — type `com.sap.xs.hdi-container`, service `hana`, plan `hdi-shared`
- `capProject-repo-host` — `html5-apps-repo`, plan `app-host`
- `capProject-destination-service` — `destination`, plan `lite`
- `uaa_capProject` — `xsuaa`, plan `application`

The destination configuration declares:
- `capProject-srv-api` as a destination pointing to `${default-url}` from the service module
- `cds_approuter_capProject_repo_host` for the HTML5 repo host
- `cds_approuter_uaa_capProject` for auth configuration

#### Security configuration
`xs-security.json` contains:
- `xsappname: capproject`
- a scope `uaa.user`
- a role template `Token_Exchange`

This means authentication is configured for UAA and is intended for an application router / XSUAA context.

#### Frontend routing and app router behavior
`app/authors/xs-app.json` defines routes:
- static UI5 resource routes: `/resources` and `/test-resources` with `authenticationType: none`
- OData route: `/odata/v4/(.*)` to `capProject-srv-api` with `authenticationType: xsuaa`
- default catch-all route: uses `html5-apps-repo-rt` with `authenticationType: xsuaa`

This is a typical HTML5 app repo + app-router pattern for a deployed UI5 app.

#### UI5 and app metadata
`app/authors/webapp/manifest.json`:
- app ID: `com.capproject.authors`
- OData source: `/odata/v4/AuthorService/`
- router and list/detail pages generated for Fiori Elements

This app is a regular UI5/Fiori app that expects the backend to provide OData at `/odata/v4/*`.

#### Build and deploy commands
Root `package.json`:
- `npm run build` -> `rimraf resources mta_archives && mbt build --mtar archive`
- `npm run deploy` -> `cf deploy mta_archives/archive.mtar --retries 1`
- `npm run undeploy` -> `cf undeploy capProject --delete-services --delete-service-keys --delete-service-brokers`

This project is built around MTA packaging and Cloud Foundry deployment.

#### Backend runtime configuration
`srv/src/main/resources/application.yaml` distinguishes:
- default profile: H2 local DB, auth disabled
- cloud profile: auto-config for data source enabled, auth enabled

This confirms the same Java application can run locally with H2 and then use BTP-managed services in cloud mode.

### Key relationships
- The Java service module is exposed as `srv-api` and is consumed by the destination service and app router routes.
- The HANA resource (`capProject-db`) is required by the Java service and the HDI deployer module.
- The HTML5 repo resource provides hosting for the UI5 app content.
- XSUAA provides security and token exchange support for the app router and protected OData access.
- The destination service supplies the runtime route to the backend and keeps HTML5 runtime integration aligned with deployed app content.

## 2. Reusable deployment architecture reference

### CAP/CDS project pattern
Typical CAP/CDS deployment includes some or all of:
- `mta.yaml` with modules for service and database deployment
- `xs-security.json` when authentication is required
- `xs-app.json` for app-router routing
- `Destination` service for backend URL exposure
- `html5-apps-repo` for UI5 app hosting
- `HANA HDI` for persistence via `com.sap.xs.hdi-container`
- Java or Node.js backend module

This repo matches that pattern.

### Standalone UI5 / non-CDS project pattern
A standalone UI5 app may need only:
- UI5 build scripts (`ui5.yaml`, `ui5-deploy.yaml` or equivalent)
- deployment target in a destination or static hosting model
- `xs-app.json` if routed through an app router
- XSUAA only if the app or remote service requires authentication
- HTML5 app-host repo only if the app is served via BTP HTML5 Apps Repo
- no HANA or HDI resource if it does not consume a database

### Required vs optional decision tree
Required decisions to make before deployment:
- Is the app a CAP service, a UI5 app, or both?
- Does it need a database?
- Does it need token-based auth?
- Is it hosted in the HTML5 Applications Repository?
- Is there a Cloud Foundry app router or does the app run behind an existing route?
- Is there an existing destination or must a new one be created?

Do not assume the project needs all of the following:
- `xsuaa`
- `html5-apps-repo`
- `destination`
- `hana`
- `app-router`

## 3. Conditional questionnaire for a new project

Ask only for information that is not already discoverable from the repo or BTP environment. Group the questions and present only the relevant subset based on the detected architecture.

### A. Application type and target platform
- What is the deployment target: SAP BTP Cloud Foundry, Kyma, or another platform?
- Is this a CAP Java, CAP Node.js, standalone UI5 app, or a hybrid app?
- Is the app already using an MTA (`mta.yaml`), or is it deployed through a different mechanism?

### B. Cloud Foundry and org/space
- What is the Cloud Foundry API endpoint for the target subaccount?
- Which Cloud Foundry org and space should receive the deployment?
- What is the target subaccount ID or name?

### C. Required services
If the project uses a database:
- Does the app need a new HANA/HDI container, or should an existing instance be reused?
- What is the HDI container/service instance name that is expected by the code or environment?

If the project uses authentication:
- Is XSUAA already configured in the target subaccount?
- Which XSUAA service instance or service key should be reused?

If the app is a UI5 app hosted via HTML5 repo:
- Is an HTML5 Apps Repository service instance already available?
- Is the app expected to be hosted via an application router or behind a different route configuration?

If the app requires a destination:
- Which destination names already exist and which should be created or updated?
- Is the target backend URL already known?

### D. Build and deployment specifics
- What is the build command and output file for this project?
- Is the intended artifact an MTAR, a ZIP, a UI5 build output, or a different archive?
- Is this a development, testing, or production deployment?
- Are there any services or applications that must be preserved and not cleaned up?

## 4. Deployment procedures

### Prerequisites and tools
Required local tooling may include:
- Cloud Foundry CLI (`cf`)
- SAP Multi-Target Application Builder (`mbt`)
- Maven (`mvn`) for Java modules
- Node.js and npm for UI5/CAP frontend or database code
- Optional: `cf-cli` login to target org/space

Check installed tools:
```bash
cf --version
mbt --version
mvn -v
node -v
npm -v
```

### Log in and target the correct BTP space
```bash
cf login -a <api-endpoint> -u <username> --sso
cf target -o <org> -s <space>
```

Verify the target space:
```bash
cf spaces
cf apps
cf services
```

### Inspect existing BTP resources
Check current deployed apps:
```bash
cf apps
```

Check existing services:
```bash
cf services
cf service <service-instance-name>
```

Check destinations in the subaccount (via BTP Cockpit or destination config):
- verify app URLs
- verify `Authentication` settings
- verify `Type`, `ProxyType`, and route targets

Check service keys for shared app dependencies:
```bash
cf service-keys <service-instance-name>
```

### Build and package a deployment
CAP/CDS + MTA project:
```bash
npm install
npm run build
```

This project uses:
```bash
mbt build --mtar archive
```

The resulting artifact is typically under `mta_archives/archive.mtar`.

For Java backend-only modules:
```bash
mvn clean package -DskipTests=true --batch-mode
```

For UI5 app module:
```bash
npm install
npm run build:cf
```

### Deploy
```bash
cf deploy mta_archives/archive.mtar --retries 1
```

Or deploy a manual archive after verifying the artifact is valid.

Monitor deployment status in the target space and in BTP Cockpit. If deployment fails during app startup, check logs for the app and the route configuration.

### Verify the result
- app is started and healthy
- backend route responds
- OData URL loads successfully
- UI loads without 401/403 errors
- destinations point to valid URLs
- HTML5 app content is available and not stale

Useful checks:
```bash
cf apps
cf logs <app-name> --recent
cf routes
cf services
```

If the app is protected by UAA, confirm the app-router and destination service are aligned with the same service instance names and auth type.

## 5. Manual SAP BTP Cockpit steps

Where the CLI does not fully cover the task, guide the user to perform these in the SAP BTP Cockpit.

### Create or confirm service instances
Use the BTP Cockpit to verify or create:
- HANA/HDI instance
- XSUAA service instance
- Destination service instance
- HTML5 Apps Repo instance

Important: Verify the instance names used in `mta.yaml` match the actual target service names exactly.

### Configure destinations
In the Destination service configuration:
- ensure the destination names match references in the app or app router
- verify `Authentication` type is supported (`NoAuthentication`, `OAuth2UserTokenExchange`, `ClientCertificate`, etc.)
- ensure `URL`, `Type`, and `ProxyType` are valid
- check that the destination points to the correct service route

### Check application router configuration
Verify:
- `xs-app.json` routes are valid
- `/odata/v4/*` is pointing to the correct backend destination
- `authenticationType` is compatible with the target app
- `html5-apps-repo-rt` is configured only when the UI5 app is actually hosted from HTML5 repo

### Validate app content and stale entries
In the HTML5 Applications Repository:
- identify stale content not tied to active app versions
- verify the app name and route are not orphaned
- remove obsolete resources only after confirming they are no longer used

## 6. CAP vs non-CAP deployment workflows

### CAP/CDS workflow
1. Confirm modules and MTA resource definitions in `mta.yaml`
2. Check XSUAA, destination, HTML5 repo, and HANA requirements
3. Ensure Java or Node backend package is built correctly
4. Build `mbt` archive or package artifacts
5. Deploy with `cf deploy`
6. Validate service routes, destinations, and app-router access
7. Inspect logs for backend and DB startup errors

### Standalone UI5 workflow
1. Confirm whether the app is served by HTML5 repo or static hosting
2. Determine whether an app router is required
3. Check whether an authentication service is needed
4. Build the UI5 app bundle with `ui5 build` or `npm run build:cf`
5. Deploy the generated archive, route, or UI app content to the correct target
6. Validate the UI route and destination configuration
7. Confirm backend service dependencies are not accidentally assumed

## 7. Troubleshooting and lessons learned

### Issue: Missing destination properties
Symptom:
- backend route is not reachable from the app
- app loads but OData calls fail

Likely cause:
- destination missing required parameters or wrong `Name`/`URL`
- missing `HTML5.DynamicDestination` or `HTML5.ForwardAuthToken`

Verification:
- inspect destination entries in BTP Cockpit
- compare service URL against actual runtime route
- verify app-router route points to destination name

Minimal fix:
- update destination definition, align names, ensure route is reachable

Caution:
- do not create duplicate destination names with different semantics

### Issue: Unsupported destination authentication type
Symptom:
- app cannot connect to backend or calls fail with authorization errors

Likely cause:
- the destination authentication mode is incompatible with the app or backend service

Verification:
- compare auth type with service expectations
- confirm token exchange or user token flow if required

Minimal fix:
- set the destination to a supported auth mode and verify service-key or credentials are consistent

### Issue: retrying an existing deployment versus deploying a newly built MTAR
Symptom:
- deployment appears to succeed but app content is stale or invalid

Likely cause:
- agent or user re-ran the deployment without rebuilding the MTAR
- old content remains in HTML5 repo or app container

Verification:
- compare MTAR timestamp or build output and deployment logs
- confirm app content and route match the latest version

Minimal fix:
- rebuild and redeploy the current artifact
- avoid mixing stale app content with a new route definition

### Issue: stale HTML5 app content remains after redeploy
Symptom:
- old UI appears even after a successful backend deployment
- app versions or route content remain stale

Likely cause:
- stale content in the HTML5 Applications Repository
- outdated app content not fully replaced during a redeploy

Verification:
- inspect existing HTML5 app resource entries and content list
- compare app route and actual deployed application version

Minimal fix:
- remove obsolete app content only after confirming it is no longer referenced
- update the content target and route configuration

Caution:
- do not delete HTML5 app content used by other apps or services

### Issue: incorrect service instance names or service-key references
Symptom:
- app router or destination not able to resolve configured services
- runtime shows resource not found or invalid service binding

Likely cause:
- mismatch between `mta.yaml` resource names and actual service names
- old service key names remain in config

Verification:
- inspect `cf services`, `cf service-keys`, and MTA resource declarations
- compare names in `mta.yaml` and in the target BTP subaccount

Minimal fix:
- align service instance names and keys with the deployed artifacts
- recreate or update only the missing binding values

### Issue: mismatch between `mta.yaml` and generated deployment artifacts
Symptom:
- build looks good, deploy fails or app is partially deployed

Likely cause:
- generated archive or content modules no longer match the declared MTA module names or paths

Verification:
- inspect `mta.yaml`, then inspect generated archive structure and app content
- confirm the expected module names and paths exist

Minimal fix:
- rebuild the archive from the current project state
- update or regenerate missing deployment metadata

### Issue: deployment succeeds for backend but fails later after startup
Symptom:
- service appears running, but app requests fail or the UI does not load

Likely cause:
- the backend started but route/destination authentication or app-router configuration is still broken

Verification:
- check app logs, route health, and destination config after startup
- verify app-router or HTML5 service settings

Minimal fix:
- correct destination route, auth type, or app configuration and redeploy only the broken portion

## 8. Safe cleanup guidance

Cleanup should only be done when the user confirms the resource is safe to remove and no other app or service depends on it.

Safe checks before destructive cleanup:
```bash
cf apps
cf services
cf service-keys <service-instance-name>
cf routes
```

Delete only after verifying:
- the instance is no longer referenced in `mta.yaml`
- no active route or app depends on it
- no shared resources are affected
- there are no stale service keys or old destinations still in use

Destructive examples that require explicit confirmation:
```bash
cf undeploy capProject --delete-services --delete-service-keys --delete-service-brokers
```

This is destructive and should be used only when the deployment should be fully removed from the space.

## 9. General advice for new projects

Before making changes, always validate:
- does the project really need CAP/CDS or is it just a static UI5 app?
- are HANA, XSUAA, HTML5 repo, destination service, and app-router actually required for the target environment?
- are the service names consistent across metadata, deployed BTP resources, and runtime configuration?
- are destinations and auth types aligned with the actual backend and deployment model?

Where possible, prefer existing service instances and destinations over creating new ones, especially when shared infrastructure is already in use.

## 10. Conclusion

The current project is a CAP Java + UI5 + HANA + XSUAA + HTML5 repo deployment pattern. It is a strong example of a full MTA-based SAP BTP deployment, but not every SAP UI5 app will require the same set of runtime services. This guide is designed to help the agent recognize the real architecture of the project and deploy only the components that are genuinely required.
