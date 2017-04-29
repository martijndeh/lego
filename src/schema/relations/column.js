export default class Column {
	name = null;
	definition = null;
	sql = null;

	constructor(name, definition, sql) {
		this.name = name;
		this.definition = definition;
		this.sql = sql;
	}

	removeConstraint(constraintType) {
		// TODO: We're mutating the internal state from the parsed sql, but we're not mutating the
		// original sql. This will result in issues. How can we properly e.g. remove a NOT NULL
		// clause from the sql? Parse & deparse? Or find & replace with a regex?

		this.definition.constraints = (this.definition.constraints || []).filter((constraint) => constraint.Constraint.contype !== constraintType);
	}

	addConstraint(constraintType) {
		const location = -1;

		// TODO: Also alter the sql and pick the right location. See also Column#removeContraint.

		const constraints = this.definition.constraints || [];
		constraints.push({
			Constraint: {
				contype: constraintType,
				location,
			},
		});

		this.definition.constraints = constraints;
	}

	getConstraints() {
		return (this.definition.constraints || []).reduce((constraints, constraint) => {
			constraints[String(constraint.Constraint.contype)] = constraint.Constraint;
			return constraints;
		}, {});
	}
}
