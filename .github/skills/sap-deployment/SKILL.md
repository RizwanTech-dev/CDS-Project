# SAP Deployment Guide

## Purpose
Use this skill when the repository contains an SAP UI5/Fiori application, a CAP/CDS project, or a Cloud Foundry-based SAP BTP deployment that needs a safe and reusable deployment workflow.

This skill helps the agent determine which deployment components are required for the current project and which are optional or unrelated, without assuming a CAP/HANA/XSUAA setup for every SAP UI5 app.

## When to invoke
Invoke this skill for:
- SAP UI5 / Fiori / OpenUI5 apps
- CAP Java or CAP Node.js projects
- MTA-based deployments to SAP BTP Cloud Foundry
- Apps using `mta.yaml`, `xs-app.json`, `xs-security.json`, `manifest.json`, `ui5.yaml`, or `ui5-deploy.yaml`
- Deployment, troubleshooting, environment validation, or migration tasks

## Required workflow
1. Inspect the repository before making changes.
2. Identify the application architecture and deployment pattern:
   - CAP/CDS + Java or Node.js
   - Standalone UI5 app
   - Hybrid app with HTML5 repo + destination service
   - App-router or no app-router
3. Determine which deployment components are required and which are unnecessary. Do not assume XSUAA, HANA, HTML5 repo, or app router are always needed.
4. Review the existing configuration before suggesting changes to deployment files.
5. Ask only for missing project-specific details using a short, conditional questionnaire.
6. Validate the user’s answers against the repository and existing SAP BTP runtime configuration.
7. Prepare or update only the minimal deployment files required.
8. Explain which actions the agent can perform automatically and which require the user, especially Cloud Foundry or SAP BTP Cockpit steps.
9. Build and deploy only after required configuration and permissions are confirmed.
10. Verify deployment results and report remaining issues clearly.

## Safety rules
- Do not delete shared service instances or resources unless the user explicitly confirms they are safe to remove.
- Do not assume a deployment can be retried safely without checking whether a new MTAR or a re-deploy of an existing artifact is intended.
- Do not request secrets directly in chat when service keys or secure BTP mechanisms are already available.
- Prefer checking existing config and BTP resources before proposing new service names, destinations, app routes, or service-key references.
- Label destructive commands clearly and require explicit confirmation before running them.

## Required reference
Follow the deployment guidance in `deployment.md` for:
- project analysis findings
- reusable architecture patterns
- conditional questionnaire
- manual deployment instructions
- troubleshooting and cleanup rules

## Result
The agent should produce a deployment plan that matches the actual architecture of the project, not a generic CAP-only deployment path.
