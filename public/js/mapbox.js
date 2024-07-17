export const displayMap = (locationsData) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoibGVvbmxvbnNkYWxlIiwiYSI6ImNsZ3dxbG1wMjAycG4zcW56M2o3NDI3YmoifQ.E60vanneX04NABbrZCCvwQ';
  const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/leonlonsdale/clgwstxud009v01pg9czj2sjm', // style URL
    scrollZoom: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locationsData.forEach((location) => {
    // create a marker
    const marker = document.createElement('div');
    marker.className = 'marker';
    // add a marker
    new mapboxgl.Marker({
      element: marker,
      anchor: 'bottom', // bottom of the pin is on the geolocation
    })
      .setLngLat(location.coordinates)
      .addTo(map);

    // add popup
    new mapboxgl.Popup({
      offset: 30,
      focusAfterOpen: false,
    })
      .setLngLat(location.coordinates)
      .setHTML(`<p>Day: ${location.day}: ${location.description}</p>`)
      .addTo(map);

    // extend the map to include the current location
    bounds.extend(location.coordinates);
  });

  // make map fit bounds
  map.fitBounds(bounds, {
    // apply padding so the pointers fit in the skewed space
    padding: { top: 200, bottom: 150, left: 100, right: 100 },
  });
};
