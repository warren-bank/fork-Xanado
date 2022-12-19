/**
* Wrapper for cldpluralruleparser brain-dead module.
*/
/* global pluralRuleParser */

import cldrpluralruleparser from "cldrpluralruleparser";

// Importing the AMD module for cldrpluralruleparser is not enough;
// we have to set the global symbol too, i18n.language relies on it.
pluralRuleParser = cldrpluralruleparser;
