import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

type Body = {
  action: 'create' | 'rename' | 'delete';
  oldKey?: string;
  newKey?: string;
  allNameKeys: string[]; // all nameKeys present AFTER the operation
};

const LOCALES = ['en', 'fr'];
const LOCALES_DIR = path.join(process.cwd(), 'src', 'locales');

async function readLocale(locale: string) {
  const p = path.join(LOCALES_DIR, `${locale}.json`);
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw) as Record<string, string>;
}

async function writeLocale(locale: string, data: Record<string, string>) {
  const p = path.join(LOCALES_DIR, `${locale}.json`);
  // pretty print with 2 spaces
  await fs.writeFile(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export async function POST(req: Request) {
  try {
    const body: Body = await req.json();
    const { action, oldKey, newKey, allNameKeys } = body;

    if (!action) return NextResponse.json({ ok: false, error: 'missing action' }, { status: 400 });

    // load all locales
    const localesData: Record<string, Record<string, string>> = {};
    for (const l of LOCALES) localesData[l] = await readLocale(l);

    for (const locale of LOCALES) {
      const data = localesData[locale];

      if (action === 'create' && newKey) {
        if (!Object.prototype.hasOwnProperty.call(data, newKey)) {
          data[newKey] = newKey;
        }
      }

      if (action === 'rename' && oldKey && newKey) {
        const valueOld = data[oldKey];
        const newExists = Object.prototype.hasOwnProperty.call(data, newKey);
        if (valueOld !== undefined) {
          // find keys with same value
          const keysWithSameValue = Object.keys(data).filter((k) => data[k] === valueOld);
          if (!newExists) {
            data[newKey] = valueOld;
          }
          // decide whether to remove oldKey: remove only if no other nameKeys (from allNameKeys) reference oldKey
          // We consider that if oldKey is not present in allNameKeys (after operation), and no other locale key uses the same value, we can remove
          const stillReferenced = allNameKeys.includes(oldKey);
          // if oldKey still referenced by some item (present in allNameKeys), we must not remove translation
          if (!stillReferenced) {
            // if multiple keys had same value, do not delete
            if (keysWithSameValue.length === 1) {
              // safe to delete
              delete data[oldKey];
            } else {
              // multiple keys share value -> keep oldKey
            }
          }
        } else {
          // oldKey not present in translations
          // If newKey doesn't exist, create placeholder
          if (!newExists) data[newKey] = newKey;
        }
      }

      if (action === 'delete' && oldKey) {
        const valueOld = data[oldKey];
        if (valueOld !== undefined) {
          // find keys with same value
          const keysWithSameValue = Object.keys(data).filter((k) => data[k] === valueOld);
          // Check if any other nameKey in allNameKeys has translation equal to valueOld
          const otherKeysUsingSameValue = allNameKeys.filter((k) => k !== oldKey && data[k] === valueOld);
          if (otherKeysUsingSameValue.length === 0 && keysWithSameValue.length <= 1) {
            delete data[oldKey];
          }
        }
      }

      // write back
      await writeLocale(locale, data);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
