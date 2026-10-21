# Mapbox Building Generator Project Commitment

## Purpose

This project exists to turn real geographic context into believable, usable, and review-ready building proposals. That requires more than attractive rendering. It requires a disciplined commitment to spatial truth, geometric coherence, and a user experience that stays dependable even when the application is doing complex work across mapping, procedural modeling, AR preview, floorplans, exports, and mobile controls.

This document states the standard the project should hold itself to as it evolves.

## Core Commitment

We commit to building and maintaining a web application that is:

- accurate in how it interprets parcels, site coordinates, and map context,
- credible in how it generates and renders 3D building geometry,
- clear and efficient in how users interact with a dense and powerful interface,
- resilient under the real conditions of a complex browser-based spatial tool.

The goal is not only to make the software functional. The goal is to make it trustworthy.

## 1. Commitment to Accurate 3D Fidelity

### 1.1 Geometry Must Be Defensible

Generated buildings should read as coherent architectural objects, not just extruded map artifacts. Every visible system should preserve internal logic:

- floor counts should correspond to believable vertical massing,
- podiums, cores, roofs, facades, parapets, and facade systems should align cleanly,
- tapered, stepped, rounded, and articulated forms should remain structurally and visually legible,
- floorplan slices and exterior massing should not contradict one another,
- exports should preserve the same model intent shown in-browser.

### 1.2 Fidelity Includes Restraint

More geometry is not automatically better. Detail should increase realism, not noise. We should prefer:

- stable facade rhythms over chaotic surface variation,
- repeatable system logic over one-off visual tricks,
- layered envelope clarity over cluttered ornament,
- procedural richness that still reads cleanly from multiple scales.

### 1.3 Materials Should Support Legibility

Rendering choices should help users understand the model:

- facade transparency should communicate intent, not obscure form,
- color choices should help distinguish building systems,
- lighting should improve depth perception and silhouette reading,
- AR and browser previews should prioritize spatial comprehension over spectacle.

### 1.4 What Fidelity Means Operationally

For this project, high 3D fidelity means:

- geometry matches configuration state,
- geometry remains coherent across view modes,
- exported geometry matches on-screen expectations,
- visual systems remain consistent across desktop, mobile, and AR contexts.

## 2. Commitment to Mapping Accuracy

### 2.1 The Map Is the Ground Truth

This is a map-native design tool. Parcel selection, uploaded GeoJSON, geocoded context, and AR placement must all respect geographic truth as closely as the browser stack allows.

We therefore commit to:

- using site coordinates consistently across render, export, and AR flows,
- keeping local meter conversions explicit and understandable,
- avoiding hidden offsets or convenience transforms that make the model feel correct while actually being spatially wrong,
- clearly separating approximate heuristics from true georeferenced placement.

### 2.2 Parcel and Footprint Integrity Matter

When the user clicks a parcel or uploads a footprint, the system should preserve the intent of that input:

- polygons should remain topologically valid,
- footprint cleaning should avoid distorting site shape,
- multi-part parcels should be handled deliberately,
- downstream massing should remain traceable back to the originating footprint.

### 2.3 AR and Geospatial Preview Must Remain Honest

AR is persuasive, which means it must also be careful. We should not create the illusion of accuracy where accuracy is uncertain.

Our standard is:

- parcel placement should be tied to real coordinates,
- ground alignment heuristics should improve placement without hiding uncertainty,
- manual bind controls should be explicit calibration tools, not silent corrections,
- proof-of-placement visuals should clarify alignment rather than distract from it.

### 2.4 Accuracy Includes Communication

Spatially accurate systems also need honest messaging. Status text, meters, headings, and error states should tell the user what is known, what is estimated, and what still needs sensor or terrain confirmation.

## 3. Commitment to Excellent User Experience

### 3.1 Complexity Must Stay Navigable

This application is inherently complex. It includes procedural massing, facade systems, floorplans, exports, AR, and map interaction. Good UX does not mean removing power. It means making power understandable.

We commit to:

- clear hierarchy between primary actions and advanced controls,
- interfaces that remain usable on narrow mobile screens,
- view states that are easy to enter and exit,
- dense controls that still preserve readability and confidence.

### 3.2 The Product Should Feel Intentional

A professional spatial tool should not feel improvised. It should feel deliberate in typography, spacing, labeling, motion, and interaction flow. Design quality is not decoration; it is part of comprehension.

That means:

- controls should look related across app, landing, and AR surfaces,
- visual language should reinforce trust and seriousness,
- important actions should be easy to find,
- visual emphasis should reflect actual workflow priority.

### 3.3 User Trust Comes From Predictability

Users should not have to guess what a control will do.

We should favor:

- explicit labels,
- stable defaults,
- meaningful live feedback,
- visible readouts for transforms and calibration,
- reversible actions where practical,
- sensible error handling over silent failure.

### 3.4 UX Includes Failure Modes

A good experience is measured not only by the happy path but by how the application behaves when permissions fail, sensors drift, exports are unavailable, or input data is messy.

We commit to:

- informative messages for denied permissions,
- graceful fallback behavior when immersive AR is unavailable,
- preserving user progress where possible,
- avoiding broken or half-rendered states when data is incomplete.

## 4. Commitment to Technical Discipline

### 4.1 Accuracy Requires Engineering Rigor

A project like this can drift quickly if implementation quality slips. We therefore commit to:

- small, understandable diffs,
- careful handling of coordinate transforms,
- avoiding unnecessary dependencies,
- keeping browser behavior stable across normal flows,
- maintaining export and rendering consistency.

### 4.2 Performance Is Part of Quality

Performance is not separate from UX. Slow, janky, or unreliable interaction makes spatial work harder to judge.

We should actively protect:

- map responsiveness,
- generation latency,
- mobile control usability,
- AR overlay stability,
- render performance under realistic model complexity.

### 4.3 Browser Constraints Must Be Respected

This is a serious spatial application running in the browser. That means we must be realistic about:

- geolocation noise,
- mobile permission friction,
- WebXR support gaps,
- storage limits,
- export size constraints,
- device performance differences.

Good engineering for this project means designing with those constraints in mind, not pretending they do not exist.

## 5. Practical Product Standards

The following standards should remain non-negotiable for day-to-day work:

- No casual regressions in parcel accuracy.
- No visual feature that undermines the user’s confidence in spatial truth.
- No interface improvement that sacrifices core usability on mobile.
- No export path that meaningfully diverges from the in-browser model without clear reason.
- No AR behavior that conceals uncertainty or sensor limitations.
- No gratuitous complexity in UI copy, controls, or rendering.

## 6. How This Commitment Should Influence Development

When making decisions, contributors should ask:

1. Does this change improve or degrade spatial accuracy?
2. Does this make the geometry more believable or merely more dramatic?
3. Does this help the user understand what the tool is doing?
4. Does this preserve trust across mapping, 3D preview, export, and AR?
5. Does this hold up on desktop and mobile under normal use?

If the answer to those questions is unclear, the change needs more discipline before it is merged.

## 7. Definition of Quality for This Project

This project should aim to be recognized for the following:

- believable architectural massing,
- reliable parcel-aware mapping behavior,
- clear and professional interface design,
- practical AR preview grounded in real spatial context,
- exportable outputs that users can trust downstream.

Quality here is not a single feature. It is the combination of geometric integrity, mapping honesty, and interface clarity.

## Closing Statement

We are committed to making Mapbox Building Generator a complex web application that behaves with the discipline of a professional spatial design tool. That means preserving accurate 3D fidelity, treating mapping accuracy as a first-class requirement, and delivering a user experience that stays readable, consistent, and trustworthy even as the product grows in power.

The standard is simple:

- if it looks good but is spatially misleading, it is not good enough;
- if it is accurate but difficult to use, it is not good enough;
- if it is powerful but inconsistent, it is not good enough.

The project should strive to be accurate, credible, and usable at the same time.
