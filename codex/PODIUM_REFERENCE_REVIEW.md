# Podium and Entrance Reference Review

## Objective

The generator should turn a clicked or uploaded footprint into a convincing street-level building base, not a single extruded volume with random windows. The podium system therefore needs a readable hierarchy: plinth, occupied streetwall floors, storefront bays, entrance portal, clear doors, weather protection, visible lobby depth, and a cap or transition to the tower.

The references below were reviewed for architectural principles rather than copied forms. The implementation uses those principles as configurable geometry that adapts to arbitrary GeoJSON footprints.

## UrbanToronto References

1. [College Park refinements and the City Planning process](https://urbantoronto.ca/news/2026/03/college-park-refinements-provide-insights-city-planning-process.60408) - layered streetwall revisions, controlled setbacks, and a legible base-to-tower transition.
2. [Etobicoke Civic Centre](https://urbantoronto.ca/news/2017/04/etobicoke-civic-centre-kpmb-architects-west-8) - civic colonnades, generous entry clearances, and deep sheltered arrival zones.
3. [The Well retail and office community](https://urbantoronto.ca/news/2017/05/well-retailers-and-offices-anchor-mixed-use-community.26748) - continuous retail frontage broken into human-scale bays and multiple entrance rhythms.
4. [Eaton Centre proposal at Yonge and Shuter](https://urbantoronto.ca/news/2025/01/67-storeys-proposed-across-eaton-centre-yonge-and-shuter-streets.57693) - transparent multi-storey base and a visually distinct tower transition.
5. [EY Tower exterior details](https://urbantoronto.ca/news/2016/09/decorative-elements-ey-towers-exterior-being-revealed) - precise metal trim, deep reveals, and material hierarchy at the lower levels.
6. [Montgomery and Duplex proposal](https://urbantoronto.ca/news/2022/07/24-storeys-proposed-montgomery-and-duplex-midtown-toronto.48631) - masonry piers, tall ground-floor openings, and residential entry emphasis.
7. [Tableau Condominiums podium](https://urbantoronto.ca/news/2014/12/touring-unique-podium-tableau-condominiums.14938) - structural expression, public-facing lobby transparency, and a strong podium cap.
8. [Bayview Village south block evolution](https://urbantoronto.ca/news/2026/01/quadreal-evolves-bayview-village-south-block-44-and-52-storey-towers.60150) - differentiated retail and residential entries within one coordinated base.
9. [286 Main Street proposal](https://urbantoronto.ca/news/2017/07/turner-fleischer-designed-tower-proposed-286-main-street.27735) - a practical bay-and-pier rhythm on a constrained urban frontage.

## New York YIMBY References

10. [6208 8th Avenue](https://newyorkyimby.com/2026/05/497-unit-tower-rises-at-6208-8th-avenue-in-sunset-park-brooklyn.html) - large mixed-use base, repeated storefront bays, and a clear horizontal datum.
11. [12 West 57th Street](https://newyorkyimby.com/2020/05/first-renderings-revealed-for-solows-52-story-skyscraper-at-12-west-57th-street-in-midtown-manhattan.html) - tall glass retail hall framed by a restrained structural portal.
12. [175 East 82nd Street](https://newyorkyimby.com/2026/05/new-rendering-revealed-for-175-east-82nd-street-on-manhattans-upper-east-side.html) - a residential entrance composed through stone depth, trim, and a protected doorway.
13. [The Avenir](https://newyorkyimby.com/2025/05/new-renderings-revealed-for-the-avenir-in-hells-kitchen-manhattan.html) - layered mixed-use frontage with separate scales for retail and lobby openings.
14. [Nordstrom Tower retail base](https://newyorkyimby.com/2016/02/official-renderings-revealed-of-nordstrom-towers-retail-base-under-construction-at-217-west-57th-street.html) - multi-level glazing, deep metal framing, and an emphatic tower-base transition.
15. [50 West 66th Street](https://newyorkyimby.com/2017/11/extells-50-west-66th-street-triples-in-size-will-become-tallest-tower-on-upper-west-side.html) - sculpted lower massing and a deliberately carved arrival sequence.
16. [Sutton Tower](https://newyorkyimby.com/2022/11/sutton-tower-wraps-up-construction-at-430-east-58th-street-in-sutton-place-manhattan.html) - subtle residential portal, warm metal details, and a quiet stone streetwall.
17. [15 Beekman Street](https://newyorkyimby.com/2021/08/new-rendering-spotted-for-15-beekman-street-in-the-financial-district-manhattan.html) - a tall institutional base with strong piers and visibly occupied lower floors.

## Implemented Design Rules

- Six coordinated starting compositions replace independent, generic podium values: transparent retail, stone portal, bronze residential, arcaded commercial, civic colonnade, and sculpted glass.
- Every podium is built as deterministic layers. Random window omission is removed.
- Streetwall glazing is divided by a configurable bay width and pier width, with upper podium floors expressed independently from the ground floor.
- The entrance is located on an automatic, longest, cardinal, or near-corner facade and remains bounded by the available edge length.
- Recessed, framed, colonnaded, and sculpted portals coordinate jambs, headers, doors, trim, and canopy geometry.
- Double doors, revolving vestibules, and retail door pairs have explicit clear glazing and frame geometry.
- A clipped lobby floor and back wall establish visible interior depth without generating a full interior model.
- Blade, framed, and deep-soffit canopies create measurable weather protection.
- A configurable podium cap creates the visual transition from base to tower.
- Rounded podiums fall back to the original parcel-edge guide, shifted to the podium outset, so buffered curves do not erase facade bays or entrances.

## Deliberate Limits

This is an architectural concept generator, not a code-compliance or shop-drawing system. It does not yet place accessible door operators, vestibule airlocks, columns coordinated to an underground grid, loading docks, egress discharge paths, signage, or interior retail demising. Those should only be added when the input contract includes program and street-access data; inventing them from a footprint alone would create false precision.
