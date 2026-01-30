# lab04

## Setup

Clone this repository. For example:

```console
cd ~/eecs498apsd/labs # or wherever you want to put labs
git clone git@github.com:eecs498-software-design/lab04.git # different url if you want to use https instead
```

Then, open the cloned repo in VS Code or another IDE.

From a terminal, run `pnpm install`. NOT `npm install` -- we are using pnpm now :).

## Exercises

Take a look at the code in the `src/` directory, which implements a simple restaurant simulation. We would like to know if our restaurant can handle a certain flow of patrons without making them wait too long.

You can run the code with:

```console
pnpm simulate
```

The code is organized as follows:
- `restaurant.ts`: Classes to represent the restaurant and simulation code
- `party-generator.ts`: A class to randomly generate parties of patrons that arrive at the restaurant

We've drawn abstraction bounds around "real-world" entities (like `Restaurant`, `Table`, and `Person`). What do you think of the code? Can you find problems with it? (Can you find a lot of problems with it?)

Work with a group of other students. You might consider firing up VS Code Live Share to collaborate.

Your task is to improve the code however you can. In particular, think about places where we've made poor design decisions in terms of the quality of our abstractions and the kinds of coupling we've introduced between them (or even places where things should be securely coupled and they're not).

We'd say that you should preserve the existing simulation behavior... but if you run the code you'll notice it doesn't even work correctly at the moment.
