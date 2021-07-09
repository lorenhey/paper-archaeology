# Experiment: Tracing Information Theory

In this experiment, we explore the intellectual genealogy of **Claude Shannon's "A Mathematical Theory of Communication" (1948)**.

## Precursors
Shannon built upon the work of Nyquist and Hartley. While the system is expanding, we can already query paths from Shannon's paper to subsequent developments in statistical mechanics.

## Path Example
We used the `paper-archaeology` CLI to find the path from E.T. Jaynes's 1957 paper to Shannon's 1948 foundational text:

```bash
uv run paper-archaeology path 9 1
```

**Output:**
```text
Path through science:
 [9] Information Theory and Statistical Mechanics (1957)
   -> cites
 [1] A Mathematical Theory of Communication (1948)
```

## Observations
- Jaynes's paper explicitly uses Shannon's information theory to re-derive statistical mechanics, providing a clear bridge between the two disciplines.
- By tracking this translation of ideas across fields, we see the real power of bibliographic archaeology.
