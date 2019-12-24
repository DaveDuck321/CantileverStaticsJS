# CantileverStaticsJS
Performs analysis and optimization of static, two-dimensional cantilever systems.

## Usage
Use a server package to expose the root of the cloned repository to an address such as `localhost:80`. Navigate here using a web browser.

This page should consist of three main sections: a visualization of the default cantilever, a table detailing the performance of the structure, and a series of input fields.

![Visualization](/screenshots/visualisation.png "Visualisation")

The visualization shows a live preview of the input structure, color-coded to show internal member tensions.
Additionally, all external reaction forces are automatically resolved with their directions shown as force arrows.
The available member types are listed to the right, their thickness on the visualization corresponds to their relative sizes.

![Analysis results](/screenshots/analysis.png "Analysis results")

The results of the analysis are listed and color coded.
The value for weight can be optimized in order to reduce material cost.
The analysis considers:
+ The different tensile strengths of the various member types
+ Mode A and Mode B buckling depending on the unsupported length and member geometry
+ The effective areas of members after rivets are used to connect them
+ The interaction between external and internal forces. External reaction forces are automatically resolved.

![Structure input](/screenshots/input.png "Structure input")

Joints are used to specify: the geometry of the structure, the external forces that act on it, and the locations of the fixed supports. 
Members are used to connect the joints together; their properties determine the structure's strength.
Member properties can be optimized to minimize cost.

The position of each joint can be specified numerically (the visualization will scale to contain the entire structure).
If only one force is specified, the system can be solved analytically giving exact points of failure for each member, else the system will be solved numerically for only the specified load.


## Building

The JavaScript is already built and ready to use.
However, if you wish to rebuild it or modify the behavior, run the TypeScript complier at the repository's root:

```
$ tsc
```
